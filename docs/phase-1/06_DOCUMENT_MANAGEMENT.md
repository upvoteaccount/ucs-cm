# UCS CM Phase 1
## Document Management Specification

**Document Status:** Approved Product Specification

## Scope
Upload, metadata, grid, PDF/image preview, download, replace, soft delete, audit. OCR, annotation, redaction, Office rendering, and records management are excluded.

## Storage
PostgreSQL stores metadata. `StorageService` stores binaries. Secure local filesystem driver is mandatory. S3 contract required; implementation is stretch scope.

## Metadata
Document ID, organisation, case, type, original filename, storage key, description, detected MIME, extension, size, uploader/time, status (`ACTIVE`, `SUPERSEDED`, `DELETED`), `replaces_document_id`, `version_sequence`, deletion metadata.

## Validation
Case access, active state, document-type permissions, size, extension, MIME, magic bytes, filename safety, multiplicity, required-document rules.

## Document Requirements & Lineage
- **Document Lineage**: Document replacement creates a new document record containing `replaces_document_id` pointing to the prior document and an incremented `version_sequence`. The prior document's status transitions to `SUPERSEDED` while remaining accessible for audit and history viewing. The new document becomes the `ACTIVE` record.
- **Required Document Rules**: Document requirements configured at case creation or workflow steps require at least one `ACTIVE` document of the specified type. Soft-deleted or `SUPERSEDED` documents do not satisfy document requirements unless an active replacement document exists.

## Grid
Name, type, description, format, size, uploader, upload time, status (`ACTIVE` by default; option to toggle `SUPERSEDED`), actions.

## Viewer
PDF/PNG/JPG/JPEG; zoom, fit, PDF navigation, full-screen, download.

## Replace/Delete
Replace preserves lineage (`replaces_document_id`, `version_sequence`, `SUPERSEDED` status) and generates audit event. Delete is logical/soft delete only in Phase 1.

## Security
No direct internal paths, authorised streaming endpoint, generated storage keys, path traversal prevention, secure permissions, preview/download audit.
