"""Extract plain text from locally stored documents."""

from __future__ import annotations

from pathlib import Path

import pymupdf


class DocumentExtractionError(ValueError):
    """Base class for expected document extraction failures."""


class DocumentNotFoundError(DocumentExtractionError):
    """Raised when the stored document is missing."""


class UnreadablePDFError(DocumentExtractionError):
    """Raised when a PDF is corrupt, encrypted, or otherwise unreadable."""


class NoMeaningfulTextError(DocumentExtractionError):
    """Raised when a PDF contains no useful extractable text."""


def extract_pdf_text(file_path: Path) -> str:
    """Return plain text extracted from a PDF at ``file_path``.

    A small alphanumeric threshold rejects empty PDFs, image-only scans,
    and files containing only incidental whitespace or page markers.
    """
    if not file_path.is_file():
        raise DocumentNotFoundError("The stored resume file could not be found.")

    try:
        with pymupdf.open(file_path) as document:
            if document.needs_pass:
                raise UnreadablePDFError(
                    "The resume PDF is password-protected and cannot be read."
                )

            page_texts = [page.get_text("text").strip() for page in document]
    except UnreadablePDFError:
        raise
    except (pymupdf.EmptyFileError, pymupdf.FileDataError, OSError, RuntimeError) as exc:
        raise UnreadablePDFError(
            "The resume PDF is corrupted or could not be read."
        ) from exc

    extracted_text = "\n\n".join(text for text in page_texts if text).strip()
    alphanumeric_count = sum(character.isalnum() for character in extracted_text)
    if alphanumeric_count < 10:
        raise NoMeaningfulTextError(
            "The resume PDF contains no meaningful extractable text."
        )

    return extracted_text
