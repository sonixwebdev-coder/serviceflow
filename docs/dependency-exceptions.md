# Dependency audit exceptions

Exceptions are temporary, evidence-based, and must be removed or renewed before their expiry date.

There are currently no active dependency-audit exceptions.

ExcelJS 4.4.0 still declares legacy ranges for `uuid` and `unzipper`. Root npm overrides select
`uuid@11.1.1` and `unzipper@0.12.5`; Excel workbook generation and streaming-reader compatibility
are covered by backend regression tests. Remove the overrides when a future ExcelJS release adopts
maintained versions directly.

CI rejects moderate, high, and critical dependency advisories. Any future exception must document
reachability evidence, an owner, and an expiry date here.
