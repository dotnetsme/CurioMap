# smoke.ps1
# Requires: running API on http://localhost:8080 and frontend on http://localhost:3123

param(
    [string]$ApiUrl = 'http://localhost:8080',
    [string]$FrontendUrl = 'http://localhost:3123'
)

$ErrorActionPreference = 'Stop'
$ts = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH_mm_ssZ')
$rand = [guid]::NewGuid().ToString().Substring(0, 8)
$email = "smoke${ts}@curiomap.local"
$pass = "SmokePass${rand}!"

$out = [System.Collections.Generic.List[string]]::new()

function Invoke-Http {
    param([string]$Uri, [string]$Method = 'GET', [object]$Body = $null, [hashtable]$Headers = @{})
    $opts = @{
        Method     = $Method
        Uri        = $Uri
        TimeoutSec = 10
    }
    if ($Headers.Count -gt 0) { $opts.Headers = $Headers }
    if ($null -ne $Body) {
        $opts.ContentType = 'application/json'
        $opts.Body = ($Body | ConvertTo-Json -Compress)
    }
    try {
        $r = Invoke-WebRequest @opts
        return @{ ok = $true; status = $r.StatusCode; body = ($r.Content | ConvertFrom-Json) }
    } catch {
        $code = 0
        if ($_.Exception.Response) {
            try { $code = [int]$_.Exception.Response.StatusCode } catch {}
        }
        return @{ ok = $false; status = $code; err = $_.Exception.Message }
    }
}
$h = Invoke-Http -Uri "$ApiUrl/health"
if ($h.ok) {
    $out.Add("HEALTH: OK ($(($h.body | ConvertTo-Json -Compress)))")
} else {
    $out.Add("HEALTH: FAIL status=$($h.status) err=$($h.err)")
}

$reg = Invoke-Http -Uri "$ApiUrl/auth/register" -Method Post -Body @{ email = $email; password = $pass }
if ($reg.ok) {
    $out.Add("REGISTER: OK")
} else {
    $out.Add("REGISTER: FAIL status=$($reg.status) err=$($reg.err)")
}

$t = $null
$uid = $null
$bid = $null
$cid = $null
if ($reg.ok -and $reg.body) {
    $t = $reg.body.token
    $uid = [guid]::Parse($reg.body.user.id)

    $me = Invoke-Http -Uri "$ApiUrl/auth/me" -Headers @{ Authorization = "Bearer $t" }
    if ($me.ok) {
        $out.Add("AUTH_ME: OK handle=$($me.body.handle)")
    } else {
        $out.Add("AUTH_ME: FAIL status=$($me.status) err=$($me.err)")
    }

    $geo = Invoke-Http -Uri "$ApiUrl/geo/me" -Method Patch -Body @{ country = 'United States'; region = 'Virginia'; city = 'Arlington' } -Headers @{ Authorization = "Bearer $t" }
    if ($geo.ok) {
        $out.Add("GEO_SET: OK")
    } else {
        $out.Add("GEO_SET: FAIL status=$($geo.status) err=$($geo.err)")
    }

    $books = Invoke-Http -Uri "$ApiUrl/books/search?q=Neuromancer"
    $out.Add("BOOK_SEARCH: OK total=$($books.body.total)")
    if ($books.ok -and $books.body.books.Count -gt 0) {
        $bid = [guid]::Parse($books.body.books[0].id)

        $bs = Invoke-Http -Uri "$ApiUrl/bookshelf" -Method Post -Body @{ book_id = $bid.ToString(); status = 'reading'; visibility = 'public' } -Headers @{ Authorization = "Bearer $t" }
        if ($bs.ok) {
            $out.Add("BOOKSHELF_ADD: OK")
        } else {
            $out.Add("BOOKSHELF_ADD: FAIL status=$($bs.status) err=$($bs.err)")
        }

        $con = Invoke-Http -Uri "$ApiUrl/books/$bid/conversations" -Method Post -Body @{ topic_type = 'general'; title = "Neuromancer thoughts $rand" } -Headers @{ Authorization = "Bearer $t" }
        if ($con.ok -and $con.body) {
            $out.Add("CONV_CREATE: OK conv=$($con.body.id)")
            $cid = [guid]::Parse($con.body.id)

            $msg = Invoke-Http -Uri "$ApiUrl/conversations/$cid/messages" -Method Post -Body @{ content = 'First message from smoke test.' } -Headers @{ Authorization = "Bearer $t" }
            if ($msg.ok) {
                $out.Add("MSG_POST: OK")
            } else {
                $out.Add("MSG_POST: FAIL status=$($msg.status) err=$($msg.err)")
            }

            $rep = Invoke-Http -Uri "$ApiUrl/messages/$cid/report" -Method Post -Body @{ reason = 'spam'; reporter_id = $uid.ToString() } -Headers @{ Authorization = "Bearer $t" }
            if ($rep.ok) {
                $out.Add("MSG_REPORT: OK")
            } else {
                $out.Add("MSG_REPORT: FAIL status=$($rep.status) err=$($rep.err)")
            }
        } else {
            $out.Add("CONV_CREATE: FAIL status=$($con.status) err=$($con.err)")
        }
    }

    $nb = Invoke-Http -Uri "$ApiUrl/discover/nearby" -Headers @{ Authorization = "Bearer $t" }
    if ($nb.ok -and $nb.body.readers) {
        $out.Add("DISCOVER_NEARBY: OK readers=$($nb.body.readers.Count)")
    } elseif ($nb.ok) {
        $out.Add("DISCOVER_NEARBY: OK")
    } else {
        $out.Add("DISCOVER_NEARBY: FAIL status=$($nb.status) err=$($nb.err)")
    }

    $gl = Invoke-Http -Uri "$ApiUrl/discover/global"
    if ($gl.ok -and $gl.body.regions) {
        $out.Add("DISCOVER_GLOBAL: OK regions=$($gl.body.regions.Count)")
    } elseif ($gl.ok) {
        $out.Add("DISCOVER_GLOBAL: OK")
    } else {
        $out.Add("DISCOVER_GLOBAL: FAIL status=$($gl.status) err=$($gl.err)")
    }

    $feed = Invoke-Http -Uri "$ApiUrl/feed" -Headers @{ Authorization = "Bearer $t" }
    if ($feed.ok) {
        $out.Add("FEED: OK")
    } else {
        $out.Add("FEED: FAIL status=$($feed.status) err=$($feed.err)")
    }
}

$front_home = Invoke-Http -Uri "$FrontendUrl/" -Method Get
if ($front_home.ok) {
    $out.Add("FRONT_HOME: OK status=$($front_home.status)")
} else {
    $out.Add("FRONT_HOME: FAIL status=$($front_home.status) err=$($front_home.err)")
}
if ($bid) {
    $front_book = Invoke-Http -Uri "$FrontendUrl/books/$bid" -Method Get
    if ($front_book.ok) {
        $out.Add("FRONT_BOOK: OK status=$($front_book.status)")
    } else {
        $out.Add("FRONT_BOOK: FAIL status=$($front_book.status) err=$($front_book.err)")
    }
}
if ($bid -and $cid) {
    $front_conv = Invoke-Http -Uri "$FrontendUrl/books/$bid/conversations/$cid" -Method Get
    if ($front_conv.ok) {
        $out.Add("FRONT_CONV: OK status=$($front_conv.status)")
    } else {
        $out.Add("FRONT_CONV: FAIL status=$($front_conv.status) err=$($front_conv.err)")
    }
}

$out -join [System.Environment]::NewLine

