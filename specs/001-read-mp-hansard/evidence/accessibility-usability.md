# Accessibility and usability evidence — acceptance pending

As of 2026-10-10, T079 remains unchecked. No ten-first-time-user study, actual
screen-reader session, or promoted Pages-address human acceptance session has
been performed in this operation. No participant times, assistive-technology
versions, physical-target results or successful publication are inferred from
automated checks.

Root also checked an actual full-source Chromium result in BM and English at
320 CSS pixels and at desktop width, with all gap/annotation details open. The
exact source words/order were compared and the page width matched the viewport.
The final bilingual help page fits 320 pixels. [Browser evidence](browser.md)
records these qualitative checks and their actual artifact scope; developer visual
inspection supplies no screen-reader or first-time-user acceptance.

The authored unit tests exercise labels, keyboard selection, focus, both-language
announcements, errors, saved notices and deliberate update controls. The recorded
Chromium/WebKit production journeys exercise actual native engines, focus and
320 CSS pixel layout for their authored controlled cases; see [browser evidence](browser.md)
and [TDD evidence](tdd.md) for their exact scope and tested inputs. jsdom supplies
no layout or assistive-technology proof. Playwright WebKit is not stable Safari,
and a developer's own successful reading is not a first-time-user result.

Final acceptance still requires keyboard and screen-reader checks in both BM
and English for every primary selection/reading/gap/source/absence/error/saved/
install/update journey at 320 CSS pixels and representative desktop widths.
Record actual device, browser, operating system, assistive technology, URL,
date, and promoted candidate bindings. At least nine of ten first-time users
must select the specified correct pair and begin reading within 60 seconds,
without assistance or an account. Unavailable or failed journeys remain open.
