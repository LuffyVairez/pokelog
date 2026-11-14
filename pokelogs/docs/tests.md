| # | Test | Steps | Expected | Result |
|---|------|-------|----------|--------|
| 1 | Skip link | Press Tab once, then Enter | Focus jumps to main content | |
| 2 | Labels | Click each form label | Matching field gets focus | |
| 3 | Game list | Open the Game dropdown | Games grouped by generation | |
| 4 | Heading order | Check headings in DevTools | One h1, then h2s | |

| 5 | Load each generation | Click Gen 1 to Gen 9 | Each shows its Pokémon, in number order | |
| 6 | Search | Type "char" | Only matching Pokémon show, status updates | |
| 7 | Search by number | Type #025 | Pikachu shows | |
| 8 | Offline | Go offline, pick a new generation | Friendly error message | |
| 9 | Cache | Revisit a generation | No new network request | |
| 10 | Switch fast | Click two generations quickly | Last click wins | |
| 11 | Start a run | Pick Emerald, add a name, press Start playthrough | Run appears in the list and is open; status confirms | |
| 12 | Add to team | With a run open, click a Pokémon | It fills slot 1; status says so | |
| 13 | Team full | Add six different Pokémon, then a seventh | Seventh refused: team is full | |
| 14 | Duplicate | Add the same Pokémon twice | Second one refused with a message | |
| 15 | No run | Delete all runs, click a Pokémon | Message says to start a playthrough first | |
| 16 | Remove | Press Remove on slot 2 | Slot empties; focus lands on that slot | |
| 17 | Persist | Reload the page | Runs, teams and the open run are still there | |
| 18 | Run notes | Type notes, reload | Notes are still there | |
| 19 | Open switches gen | Open a Gen 3 run while Gen 1 is shown | Pokémon list switches to Gen 3 | |
| 20 | Keyboard only | Repeat 11 to 16 without a mouse | Everything works; focus always visible | |
| 21 | Moves saved | Open a team member's Moves and note, type four moves, reload | All four moves are still there | |
| 22 | Suggestions | Online, click a Move field | A list of that Pokémon's moves appears; typing your own also works | |
| 23 | Member note | Type a note on one member, reload | Note is still there | |
| 24 | Stays open | Open slot 1's section, then add another Pokémon | Slot 1's section stays open | |
| 25 | Old data | Load a team saved before step 5 | No errors; empty move fields appear | |
| 26 | Re-add | Remove a member, add the same Pokémon again | Moves and note start empty | || 27 | Export | Press Export backup with at least one run | A .json file downloads; status gives the count | |
| 28 | Export empty | Delete all runs, press Export backup | Message says there is nothing to export | |
| 29 | Restore | Delete the teamlog-data key in DevTools (Application, Local Storage), reload, import your backup | Confirm appears; runs, teams, moves and notes all return | |
| 30 | Bad file | Import a .txt file, then a random .json file | Friendly error; your data is unchanged | |
| 31 | Cancel import | Choose a backup, press Cancel on the confirm | "Import cancelled"; nothing changes | |
| 32 | Progress | Start a Gen 3 run and fill six slots | Gen 3 row shows Started 1, Full teams 1 | |
| 33 | Progress updates | Delete that run | Gen 3 row goes back to 0 and 0 | |
| 34 | HTML validator | Check index.html at validator.w3.org | 0 errors | |
| 35 | WAVE | Run WAVE with a run open and a details section expanded | 0 errors | |
| 36 | Lighthouse | Run it in a private window, mobile | 90+ in all four categories | |
| 37 | Live site | Open the GitHub Pages address on your phone | Generations load, run can be started | |
