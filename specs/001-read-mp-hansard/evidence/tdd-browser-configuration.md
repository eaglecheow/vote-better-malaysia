# Frozen browser and workflow prerequisites

Observed 2026-10-10 18:35:33 MYT using Node 24.21.0 and Vitest 5.0.3.
The active workflow was still its inert pending job and the real Playwright
configuration still rebuilt before every preview.

Command: `npx vitest run tests/unit/publication-workflow.test.ts tests/unit/browser-configuration.test.ts`.
Result: 54 assertion-failing cases, two already-passing controls. The workflow's
previous 50 RED cases remain; PUB-WF046 and PUB-WF047 independently fail for
missing native-engine installation/order and original failure/refresh receipt
transport. BROWSER-CONFIG001 and BROWSER-CONFIG002 fail against the actual imported
configuration for rebuilding frozen bytes and omitting quoted frozen output.
The ordinary development preview and prior workflow controls are not new RED.
No missing import, YAML parser, matcher or filesystem error establishes this gate.

Raw output: [publication-browser-configuration-red.log](publication-browser-configuration-red.log).
SHA-256: `e0e27e5217a40b15fbd657e644bd62e1949bff1fefbab777c47e1cfc7124b808`.

Inputs before production change:

- workflow tests: `388ed256daa4e6e85150c70bdcc5e5ad689f8d9d26d33e333242110341e7a461`
- browser configuration tests: `c90f1be47865cc8b734d76cb3da510d0e63ecd9d03e3f11e6f9515193f6ffc4a`
- actual Playwright configuration: `87b22c1209ea6023ae7465439cb2ccb3955dbabcff92fdd19ed83f33631b5a84`
- inert active workflow: `6636db94b27abff81b093ebbb3a58405d96ff020abc9cb6881777a3c3b766d47`

The corresponding production changes may now proceed. Frozen-artifact browser
invocation previews the original directory without rebuilding. Browser installation
runs only on preparation; promotion and evidence collection do not require it.
Original capped-run receipts remain private, independently validated resume inputs.
These configuration assertions do not prove a remote run or any actual device result.

The frozen preview implementation was then observed GREEN at 18:36:10 MYT:
`npx vitest run tests/unit/browser-configuration.test.ts`, three of three passing.
[Raw GREEN](browser-configuration-green.log), SHA-256
`4cdd62661ac92de0aa7c6251aa7b7e7ce231697c53237f46463eb6a157e8645c`.
The resulting Playwright configuration hash is
`ea06d6796b0ed86333aaca0bdcfd022189c25e5a4d9df13816638e877072c3ee`.
Typecheck passed before production and the subsequent callable-documentation
check returned no findings. No refactor was needed. Workflow GREEN remains pending
adoption and review of the real controller transport.
