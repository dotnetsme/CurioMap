using System.ComponentModel.DataAnnotations;

namespace CurioMap.Api.Contracts;

public record AddBookshelfRequest(
    [ Required] Guid BookId,
    [ Required, MaxLength(20)] string Status,
    [ MaxLength(20)] string? Visibility);

public record UpdateBookshelfRequest(
    [ MaxLength(20)] string? Status,
    [ MaxLength(20)] string? Visibility,
    DateTime? StartedAt,
    DateTime? FinishedAt);

public record BookshelfEntryDto(
    Guid Id,
    Guid BookId,
    BookStubDto Book,
    string Status,
    string Visibility,
    DateTime? StartedAt,
    DateTime? FinishedAt,
    DateTime CreatedAt);
