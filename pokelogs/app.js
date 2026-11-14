/* ========== CONFIG ========== */
const SUPABASE_URL = "https://wwnksgzmhaikhkqmqhak.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_o53eZu0gHdHnGTBbJrUFPA_BBjT12af";

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const API = "https://pokeapi.co/api/v2";
const SPRITES = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/";
const STORE_KEY = "teamlog-active";
const CACHE_PREFIX = "teamlog-v2-gen-";
const TEAM_SIZE = 6;
const MOVE_COUNT = 4;
const GEN_NAMES = ["Kanto", "Johto", "Hoenn", "Sinnoh", "Unova", "Kalos", "Alola", "Galar", "Paldea"];
const TEAM_HELP = "Start or choose a playthrough, then add up to six Pokémon.";

// Extra Gen 8 Forms (19 Galarian, 17 Hisuian, 2 Origin Formes)
// Note: The 7 new Hisui species (#899-#905: Wyrdeer, Kleavor, Ursaluna, Basculegion, Sneasler, Overqwil, Enamorus)
// are already included automatically in PokéAPI's /generation/8 endpoint.
const GEN8_EXTRA_FORMS = [
  // 19 Galarian Regional Forms
  { id: 10161, name: "Galarian Meowth" },
  { id: 10162, name: "Galarian Ponyta" },
  { id: 10163, name: "Galarian Rapidash" },
  { id: 10164, name: "Galarian Slowpoke" },
  { id: 10165, name: "Galarian Slowbro" },
  { id: 10166, name: "Galarian Farfetch'd" },
  { id: 10167, name: "Galarian Weezing" },
  { id: 10168, name: "Galarian Mr. Mime" },
  { id: 10169, name: "Galarian Articuno" },
  { id: 10170, name: "Galarian Zapdos" },
  { id: 10171, name: "Galarian Moltres" },
  { id: 10172, name: "Galarian Slowking" },
  { id: 10173, name: "Galarian Corsola" },
  { id: 10174, name: "Galarian Zigzagoon" },
  { id: 10175, name: "Galarian Linoone" },
  { id: 10176, name: "Galarian Darumaka" },
  { id: 10177, name: "Galarian Darmanitan" },
  { id: 10179, name: "Galarian Yamask" },
  { id: 10180, name: "Galarian Stunfisk" },

  // 17 Hisuian Regional Forms
  { id: 10229, name: "Hisuian Growlithe" },
  { id: 10230, name: "Hisuian Arcanine" },
  { id: 10231, name: "Hisuian Voltorb" },
  { id: 10232, name: "Hisuian Electrode" },
  { id: 10233, name: "Hisuian Typhlosion" },
  { id: 10234, name: "Hisuian Qwilfish" },
  { id: 10235, name: "Hisuian Sneasel" },
  { id: 10236, name: "Hisuian Samurott" },
  { id: 10237, name: "Hisuian Lilligant" },
  { id: 10238, name: "Hisuian Zorua" },
  { id: 10239, name: "Hisuian Zoroark" },
  { id: 10240, name: "Hisuian Braviary" },
  { id: 10241, name: "Hisuian Sliggoo" },
  { id: 10242, name: "Hisuian Goodra" },
  { id: 10243, name: "Hisuian Avalugg" },
  { id: 10244, name: "Hisuian Decidueye" },
  { id: 10247, name: "Basculin (White-Striped)" },

  // 2 Origin Formes
  { id: 10245, name: "Dialga (Origin Forme)" },
  { id: 10246, name: "Palkia (Origin Forme)" }
];

/* ========== STATE ========== */
let currentUser = null;
let currentGen = 1;
let currentList = [];
const memory = {};
const movesMemory = {};
const openSlots = new Set();

let state = {
  runs: [],
  activeId: null
};

/* ========== HELPERS ========== */
function idFromUrl(url) {
  const parts = url.split("/").filter(Boolean);
  return Number(parts[parts.length - 1]);
}

function prettyName(slug) {
  return slug
    .split("-")
    .map(function (word) {
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

function pad(id) {
  return String(id).padStart(3, "0");
}

function plural(count, word) {
  return count + " " + word + (count === 1 ? "" : "s");
}

function isMon(item) {
  return item && typeof item.id === "number" && typeof item.name === "string";
}

function makeSpan(className, text) {
  const span = document.createElement("span");
  span.className = className;
  span.textContent = text;
  return span;
}

function makeSprite(id) {
  const img = document.createElement("img");
  img.className = "sprite";
  img.src = SPRITES + id + ".png";
  img.alt = "";
  img.width = 96;
  img.height = 96;
  img.loading = "lazy";
  img.addEventListener("error", function () {
    img.removeAttribute("src");
  });
  return img;
}

function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function activeRun() {
  return state.runs.find(function (run) {
    return run.id === state.activeId;
  }) || null;
}

function runLabel(run) {
  return run.game + (run.name ? ", " + run.name : "");
}

function filledCount(run) {
  return run.team.filter(Boolean).length;
}

function fillMember(slot) {
  const moves = Array.isArray(slot.moves) ? slot.moves : [];
  const filled = [];
  for (let i = 0; i < MOVE_COUNT; i++) {
    filled.push(typeof moves[i] === "string" ? moves[i].slice(0, 30) : "");
  }
  return {
    id: slot.id,
    name: slot.name,
    moves: filled,
    note: typeof slot.note === "string" ? slot.note.slice(0, 300) : ""
  };
}

function cleanRun(run) {
  return {
    id: run.id,
    game: String(run.game || "").slice(0, 40),
    gen: Number(run.gen) || 1,
    name: String(run.name || "").slice(0, 60),
    notes: String(run.notes || "").slice(0, 2000),
    team: Array.isArray(run.team)
      ? run.team.map(function (slot) {
          return slot ? fillMember(slot) : null;
        })
      : new Array(TEAM_SIZE).fill(null),
    created: typeof run.created === "number" ? run.created : Date.now()
  };
}

/* ========== INIT APP AFTER DOM LOADS ========== */
document.addEventListener("DOMContentLoaded", function () {
  /* ========== DOM ========== */
  const authScreen = document.getElementById("auth-screen");
  const appEl = document.getElementById("app");
  const authForm = document.getElementById("auth-form");
  const authEmail = document.getElementById("auth-email");
  const authPassword = document.getElementById("auth-password");
  const loginBtn = document.getElementById("login-btn");
  const signupBtn = document.getElementById("signup-btn");
  const authStatus = document.getElementById("auth-status");
  const userEmailEl = document.getElementById("user-email");
  const logoutBtn = document.getElementById("logout-btn");

  const gensEl = document.getElementById("gens");
  const dexEl = document.getElementById("dex");
  const dexStatus = document.getElementById("dex-status");
  const searchEl = document.getElementById("dex-search");

  const runForm = document.getElementById("run-form");
  const gameEl = document.getElementById("game");
  const runNameEl = document.getElementById("run-name");
  const runStatus = document.getElementById("run-status");
  const runListEl = document.getElementById("run-list");
  const runsEmpty = document.getElementById("runs-empty");
  const teamEl = document.getElementById("team");
  const teamHelp = document.getElementById("team-help");
  const teamStatus = document.getElementById("team-status");
  const notesEl = document.getElementById("run-notes");
  const progressBody = document.getElementById("progress-body");
  const exportBtn = document.getElementById("export");
  const importEl = document.getElementById("import");
  const backupStatus = document.getElementById("backup-status");

  /* ========== AUTH ========== */
  function showAuth() {
    if (authScreen) authScreen.hidden = false;
    if (appEl) appEl.hidden = true;
    if (authStatus) authStatus.textContent = "";
    if (authForm) authForm.reset();
  }

  function showApp() {
    if (authScreen) authScreen.hidden = true;
    if (appEl) appEl.hidden = false;
    if (userEmailEl) userEmailEl.textContent = currentUser ? currentUser.email : "";
  }

  async function handleLogin(email, password) {
    if (authStatus) authStatus.textContent = "Logging in…";
    if (loginBtn) loginBtn.disabled = true;
    if (signupBtn) signupBtn.disabled = true;

    const { data, error } = await sb.auth.signInWithPassword({
      email: email,
      password: password
    });

    if (loginBtn) loginBtn.disabled = false;
    if (signupBtn) signupBtn.disabled = false;

    if (error) {
      if (authStatus) authStatus.textContent = error.message;
      return;
    }

    currentUser = data.user;
    await loadRunsFromCloud();
    showApp();
    renderAll();
  }

  async function handleSignup(email, password) {
    if (authStatus) authStatus.textContent = "Creating account…";
    if (loginBtn) loginBtn.disabled = true;
    if (signupBtn) signupBtn.disabled = true;

    const { data, error } = await sb.auth.signUp({
      email: email,
      password: password
    });

    if (loginBtn) loginBtn.disabled = false;
    if (signupBtn) signupBtn.disabled = false;

    if (error) {
      if (authStatus) authStatus.textContent = error.message;
      return;
    }

    if (data.user && data.session) {
      currentUser = data.user;
      state = { runs: [], activeId: null };
      showApp();
      renderAll();
      if (authStatus) authStatus.textContent = "";
    } else if (authStatus) {
      authStatus.textContent = "Account created! Check your email to confirm, then log in.";
    }
  }

  async function handleLogout() {
    await sb.auth.signOut();
    currentUser = null;
    state = { runs: [], activeId: null };
    showAuth();
  }

  authForm?.addEventListener("submit", function (event) {
    event.preventDefault();
    const email = authEmail.value.trim();
    const password = authPassword.value;
    if (!email || !password) return;
    handleLogin(email, password);
  });

  signupBtn?.addEventListener("click", function () {
    const email = authEmail.value.trim();
    const password = authPassword.value;
    if (!email || !password) {
      if (authStatus) authStatus.textContent = "Please enter email and password first.";
      return;
    }
    if (password.length < 6) {
      if (authStatus) authStatus.textContent = "Password must be at least 6 characters.";
      return;
    }
    handleSignup(email, password);
  });

  logoutBtn?.addEventListener("click", handleLogout);

  /* ========== CLOUD DATA ========== */
  async function loadRunsFromCloud() {
    if (!currentUser) return;

    const { data, error } = await sb
      .from("runs")
      .select("*")
      .eq("user_id", currentUser.id)
      .order("created", { ascending: false });

    if (error) {
      console.error(error);
      if (runStatus) runStatus.textContent = "Could not load your playthroughs. Try refreshing.";
      state.runs = [];
      return;
    }

    state.runs = (data || []).map(function (row) {
      return cleanRun({
        id: row.id,
        game: row.game,
        gen: row.gen,
        name: row.name,
        notes: row.notes,
        team: row.team,
        created: row.created
      });
    });

    const savedActive = localStorage.getItem(STORE_KEY);
    const stillThere = state.runs.some(function (r) {
      return r.id === savedActive;
    });
    state.activeId = stillThere ? savedActive : (state.runs[0] ? state.runs[0].id : null);
  }

  async function saveRunToCloud(run) {
    if (!currentUser) return false;

    const payload = {
      id: run.id,
      user_id: currentUser.id,
      game: run.game,
      gen: run.gen,
      name: run.name || "",
      notes: run.notes || "",
      team: run.team,
      created: run.created,
      updated_at: new Date().toISOString()
    };

    const { error } = await sb.from("runs").upsert(payload);

    if (error) {
      console.error(error);
      if (runStatus) runStatus.textContent = "Could not save. Check your connection.";
      return false;
    }
    return true;
  }

  async function deleteRunFromCloud(id) {
    if (!currentUser) return false;

    const { error } = await sb.from("runs").delete().eq("id", id);

    if (error) {
      console.error(error);
      if (runStatus) runStatus.textContent = "Could not delete. Check your connection.";
      return false;
    }
    return true;
  }

  async function persist() {
    const run = activeRun();
    if (run) {
      localStorage.setItem(STORE_KEY, run.id);
      return await saveRunToCloud(run);
    }
    return true;
  }

  /* ========== GENERATION DATA ========== */
  function readCache(gen) {
    try {
      const raw = JSON.parse(localStorage.getItem(CACHE_PREFIX + gen));
      return Array.isArray(raw) && raw.every(isMon) ? raw : null;
    } catch (error) {
      return null;
    }
  }

  function writeCache(gen, list) {
    try {
      localStorage.setItem(CACHE_PREFIX + gen, JSON.stringify(list));
    } catch (error) {
      console.error(error);
    }
  }

  async function getGeneration(gen) {
    if (memory[gen]) return memory[gen];

    const cached = readCache(gen);
    if (cached) {
      memory[gen] = cached;
      return cached;
    }

    const response = await fetch(API + "/generation/" + gen);
    if (!response.ok) throw new Error("PokéAPI answered " + response.status);
    const json = await response.json();

    const list = json.pokemon_species
      .map(function (species) {
        return { id: idFromUrl(species.url), name: prettyName(species.name) };
      })
      .sort(function (a, b) {
        return a.id - b.id;
      });

    // Append Galarian, Hisuian, and Origin Formes to Gen 8
    if (gen === 8) {
      GEN8_EXTRA_FORMS.forEach(function (form) {
        if (!list.some(function (item) { return item.id === form.id; })) {
          list.push(form);
        }
      });
    }

    memory[gen] = list;
    writeCache(gen, list);
    return list;
  }

  function getMoves(id) {
    if (!movesMemory[id]) {
      movesMemory[id] = fetch(API + "/pokemon/" + id)
        .then(function (response) {
          if (!response.ok) throw new Error("PokéAPI answered " + response.status);
          return response.json();
        })
        .then(function (json) {
          return json.moves
            .map(function (item) {
              return prettyName(item.move.name);
            })
            .sort();
        })
        .catch(function (error) {
          console.error(error);
          delete movesMemory[id];
          return [];
        });
    }
    return movesMemory[id];
  }

  /* ========== RENDER HELPERS ========== */
  function makeRunButton(text, action, id, label, ghost) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = text;
    button.dataset.action = action;
    button.dataset.run = id;
    button.setAttribute("aria-label", label);
    if (ghost) button.className = "ghost";
    return button;
  }

  function renderRuns() {
    if (runsEmpty) runsEmpty.hidden = state.runs.length > 0;

    const fragment = document.createDocumentFragment();

    state.runs.forEach(function (run) {
      const isActive = run.id === state.activeId;
      const li = document.createElement("li");
      li.className = isActive ? "run active" : "run";

      const info = document.createElement("div");
      const title = document.createElement("strong");
      title.textContent = run.game;
      const detail = document.createElement("span");
      detail.textContent =
        "Gen " + run.gen + (run.name ? ", " + run.name : "") + ", " + filledCount(run) + " of " + TEAM_SIZE + " on team";
      info.append(title, detail);

      const actions = document.createElement("div");
      actions.className = "actions";

      const open = makeRunButton(
        isActive ? "Open now" : "Open",
        "open",
        run.id,
        isActive ? runLabel(run) + " is open" : "Open " + runLabel(run),
        false
      );
      if (isActive) open.setAttribute("aria-current", "true");

      const remove = makeRunButton("Delete", "delete", run.id, "Delete " + runLabel(run), true);

      actions.append(open, remove);
      li.append(info, actions);
      fragment.append(li);
    });

    runListEl?.replaceChildren(fragment);
    renderProgress();
  }

  function makeField(labelText, id, control) {
    const wrap = document.createElement("div");
    wrap.className = "field";
    const label = document.createElement("label");
    label.htmlFor = id;
    label.textContent = labelText;
    control.id = id;
    wrap.append(label, control);
    return wrap;
  }

  function makeDetails(mon, index) {
    const details = document.createElement("details");
    details.className = "slot-edit";
    details.open = openSlots.has(mon.id);
    details.addEventListener("toggle", function () {
      if (details.open) openSlots.add(mon.id);
      else openSlots.delete(mon.id);
    });

    const summary = document.createElement("summary");
    summary.textContent = "Moves and note";
    summary.setAttribute("aria-label", "Moves and note for " + mon.name);
    details.append(summary);

    const datalist = document.createElement("datalist");
    datalist.id = "moves-" + mon.id;
    getMoves(mon.id).then(function (names) {
      const options = document.createDocumentFragment();
      names.forEach(function (name) {
        const option = document.createElement("option");
        option.value = name;
        options.append(option);
      });
      datalist.replaceChildren(options);
    });

    for (let m = 0; m < MOVE_COUNT; m++) {
      const input = document.createElement("input");
      input.type = "text";
      input.maxLength = 30;
      input.value = mon.moves[m];
      input.autocomplete = "off";
      input.setAttribute("list", datalist.id);
      input.setAttribute("aria-label", "Move " + (m + 1) + " for " + mon.name);
      input.dataset.slot = index;
      input.dataset.kind = "move";
      input.dataset.move = m;
      details.append(makeField("Move " + (m + 1), "move-" + index + "-" + m, input));
    }

    const note = document.createElement("textarea");
    note.rows = 2;
    note.maxLength = 300;
    note.value = mon.note;
    note.setAttribute("aria-label", "Note for " + mon.name);
    note.dataset.slot = index;
    note.dataset.kind = "note";
    details.append(makeField("Note", "note-" + index, note), datalist);

    return details;
  }

  function renderTeam() {
    const run = activeRun();

    if (notesEl) {
      notesEl.disabled = !run;
      notesEl.value = run ? run.notes : "";
    }

    if (teamHelp) {
      teamHelp.textContent = run
        ? runLabel(run) + ": " + filledCount(run) + " of " + TEAM_SIZE + " slots filled. Select a Pokémon below to add it."
        : TEAM_HELP;
    }

    const fragment = document.createDocumentFragment();

    for (let i = 0; i < TEAM_SIZE; i++) {
      const mon = run ? run.team[i] : null;
      const li = document.createElement("li");
      li.tabIndex = -1;

      if (mon) {
        li.className = "slot filled";

        const info = document.createElement("div");
        info.className = "slot-info";
        info.append(
          makeSpan("slot-label", "Slot " + (i + 1)),
          makeSpan("name", mon.name),
          makeSpan("num", "#" + pad(mon.id))
        );

        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "ghost remove";
        remove.textContent = "Remove";
        remove.dataset.slot = i;
        remove.setAttribute("aria-label", "Remove " + mon.name + " from slot " + (i + 1));

        li.append(makeSprite(mon.id), info, makeDetails(mon, i), remove);
      } else {
        li.className = "slot";
        const p = document.createElement("p");
        p.textContent = "Slot " + (i + 1) + ": empty";
        li.append(p);
      }

      fragment.append(li);
    }

    teamEl?.replaceChildren(fragment);
  }

  function renderProgress() {
    const fragment = document.createDocumentFragment();

    GEN_NAMES.forEach(function (region, index) {
      const gen = index + 1;
      const runs = state.runs.filter(function (run) {
        return run.gen === gen;
      });
      const full = runs.filter(function (run) {
        return filledCount(run) === TEAM_SIZE;
      });

      const row = document.createElement("tr");
      const head = document.createElement("th");
      head.scope = "row";
      head.textContent = "Gen " + gen + " " + region;
      const started = document.createElement("td");
      started.textContent = runs.length;
      const complete = document.createElement("td");
      complete.textContent = full.length;

      row.append(head, started, complete);
      fragment.append(row);
    });

    progressBody?.replaceChildren(fragment);
  }

  function renderAll() {
    renderRuns();
    renderTeam();
    const startRun = activeRun();
    loadGen(startRun ? startRun.gen : 1);
  }

  /* ========== TEAM ACTIONS ========== */
  async function addToTeam(id) {
    const run = activeRun();
    if (!run) {
      if (teamStatus) teamStatus.textContent = "Start or open a playthrough first, then add Pokémon.";
      return;
    }

    const mon = currentList.find(function (item) {
      return item.id === id;
    });
    if (!mon) return;

    const already = run.team.some(function (slot) {
      return slot && slot.id === mon.id;
    });
    if (already) {
      if (teamStatus) teamStatus.textContent = mon.name + " is already on this team.";
      return;
    }

    const index = run.team.indexOf(null);
    if (index === -1) {
      if (teamStatus) teamStatus.textContent = "Your team is full. Remove a Pokémon to make room.";
      return;
    }

    run.team[index] = fillMember({ id: mon.id, name: mon.name });
    await persist();
    renderRuns();
    renderTeam();
    if (teamStatus) teamStatus.textContent = mon.name + " added to slot " + (index + 1) + ".";
  }

  async function removeFromTeam(index) {
    const run = activeRun();
    if (!run || !run.team[index]) return;

    const name = run.team[index].name;
    run.team[index] = null;
    await persist();
    renderRuns();
    renderTeam();
    if (teamStatus) teamStatus.textContent = name + " removed from slot " + (index + 1) + ".";
    teamEl?.children[index]?.focus();
  }

  /* ========== PLAYTHROUGH ACTIONS ========== */
  async function openRun(id) {
    const run = state.runs.find(function (item) {
      return item.id === id;
    });
    if (!run) return;

    state.activeId = id;
    localStorage.setItem(STORE_KEY, id);
    renderRuns();
    renderTeam();
    if (teamStatus) teamStatus.textContent = "";
    if (runStatus) runStatus.textContent = "Opened " + runLabel(run) + ".";

    if (run.gen !== currentGen) {
      loadGen(run.gen);
    }
  }

  async function deleteRun(id) {
    const run = state.runs.find(function (item) {
      return item.id === id;
    });
    if (!run) return;

    if (!window.confirm("Delete " + runLabel(run) + " and its team? This can’t be undone.")) {
      return;
    }

    const ok = await deleteRunFromCloud(id);
    if (!ok) return;

    state.runs = state.runs.filter(function (item) {
      return item.id !== id;
    });
    if (state.activeId === id) {
      state.activeId = null;
      localStorage.removeItem(STORE_KEY);
    }
    renderRuns();
    renderTeam();
    if (runStatus) runStatus.textContent = "Deleted " + runLabel(run) + ".";
  }

  runForm?.addEventListener("submit", async function (event) {
    event.preventDefault();

    const option = gameEl.selectedOptions[0];
    const run = {
      id: makeId(),
      game: gameEl.value,
      gen: Number(option.parentElement.dataset.gen),
      name: runNameEl.value.trim(),
      notes: "",
      team: new Array(TEAM_SIZE).fill(null),
      created: Date.now()
    };

    const ok = await saveRunToCloud(run);
    if (!ok) return;

    state.runs.unshift(run);
    state.activeId = run.id;
    localStorage.setItem(STORE_KEY, run.id);

    runForm.reset();
    renderRuns();
    renderTeam();
    if (teamStatus) teamStatus.textContent = "";
    if (runStatus) runStatus.textContent = "Started " + runLabel(run) + ". Pick Pokémon below to fill your team.";

    if (run.gen !== currentGen) {
      loadGen(run.gen);
    }
  });

  runListEl?.addEventListener("click", function (event) {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    if (button.dataset.action === "open") {
      openRun(button.dataset.run);
    } else if (button.dataset.action === "delete") {
      deleteRun(button.dataset.run);
    }
  });

  teamEl?.addEventListener("click", function (event) {
    const button = event.target.closest("button[data-slot]");
    if (button) {
      removeFromTeam(Number(button.dataset.slot));
    }
  });

  teamEl?.addEventListener("input", async function (event) {
    const field = event.target;
    const run = activeRun();
    if (!run || !field.dataset.kind) return;

    const mon = run.team[Number(field.dataset.slot)];
    if (!mon) return;

    if (field.dataset.kind === "move") {
      mon.moves[Number(field.dataset.move)] = field.value;
    } else {
      mon.note = field.value;
    }
    await persist();
  });

  notesEl?.addEventListener("input", async function () {
    const run = activeRun();
    if (run) {
      run.notes = notesEl.value;
      await persist();
    }
  });

  /* ========== POKÉDEX ========== */
  function showDex(list) {
    const fragment = document.createDocumentFragment();

    list.forEach(function (mon) {
      const li = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.id = mon.id;
      button.append(makeSprite(mon.id), makeSpan("num", "#" + pad(mon.id)), makeSpan("name", mon.name));
      li.append(button);
      fragment.append(li);
    });

    dexEl?.replaceChildren(fragment);
  }

  function applyFilter() {
    const query = (searchEl?.value || "").trim().toLowerCase();
    const digits = query.replace("#", "");

    const shown = currentList.filter(function (mon) {
      return mon.name.toLowerCase().includes(query) || pad(mon.id).includes(digits);
    });

    showDex(shown);

    if (currentList.length === 0 || !dexStatus) return;
    if (shown.length === 0) {
      dexStatus.textContent = "No Pokémon match “" + searchEl.value.trim() + "”.";
    } else {
      dexStatus.textContent = "Showing " + shown.length + " of " + currentList.length + " Pokémon.";
    }
  }

  async function loadGen(gen) {
    currentGen = gen;

    gensEl?.querySelectorAll("button").forEach(function (button) {
      button.setAttribute("aria-pressed", Number(button.dataset.gen) === gen);
    });

    if (dexStatus) dexStatus.textContent = "Loading generation " + gen + "…";
    dexEl?.replaceChildren();
    if (searchEl) searchEl.value = "";

    try {
      const list = await getGeneration(gen);
      if (gen !== currentGen) return;
      currentList = list;
      applyFilter();
    } catch (error) {
      if (gen !== currentGen) return;
      console.error(error);
      currentList = [];
      if (dexStatus) {
        dexStatus.textContent = "Couldn’t load generation " + gen + ". Check your connection, then select it again.";
      }
    }
  }

  gensEl?.addEventListener("click", function (event) {
    const button = event.target.closest("button[data-gen]");
    if (button) loadGen(Number(button.dataset.gen));
  });

  dexEl?.addEventListener("click", function (event) {
    const button = event.target.closest("button[data-id]");
    if (button) addToTeam(Number(button.dataset.id));
  });

  searchEl?.addEventListener("input", applyFilter);

  /* ========== BACKUP ========== */
  function exportBackup() {
    if (state.runs.length === 0) {
      if (backupStatus) backupStatus.textContent = "Nothing to export yet. Start a playthrough first.";
      return;
    }

    const data = {
      app: "teamlog",
      version: 1,
      exported: new Date().toISOString(),
      runs: state.runs,
      activeId: state.activeId
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "team-log-backup-" + new Date().toISOString().slice(0, 10) + ".json";
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 1000);

    if (backupStatus) backupStatus.textContent = "Backup downloaded with " + plural(state.runs.length, "playthrough") + ".";
  }

  async function importBackup() {
    const file = importEl?.files?.[0];
    if (!file) return;

    try {
      const data = JSON.parse(await file.text());
      if (!data || !Array.isArray(data.runs)) {
        throw new Error("Not a Team Log backup");
      }

      const runs = data.runs.map(cleanRun);
      const message =
        "Restoring will replace your current " +
        plural(state.runs.length, "playthrough") +
        " with the " +
        plural(runs.length, "playthrough") +
        " in this file. Continue?";
      if (!window.confirm(message)) {
        if (backupStatus) backupStatus.textContent = "Import cancelled. Nothing changed.";
        return;
      }

      for (const old of state.runs) {
        await deleteRunFromCloud(old.id);
      }

      state.runs = [];
      for (const run of runs) {
        const ok = await saveRunToCloud(run);
        if (ok) state.runs.push(run);
      }

      const stillThere = state.runs.some(function (r) {
        return r.id === data.activeId;
      });
      state.activeId = stillThere ? data.activeId : (state.runs[0] ? state.runs[0].id : null);
      if (state.activeId) localStorage.setItem(STORE_KEY, state.activeId);

      renderRuns();
      renderTeam();
      if (teamStatus) teamStatus.textContent = "";
      if (backupStatus) backupStatus.textContent = "Restored " + plural(state.runs.length, "playthrough") + ".";

      const run = activeRun();
      if (run && run.gen !== currentGen) loadGen(run.gen);
    } catch (error) {
      console.error(error);
      if (backupStatus) {
        backupStatus.textContent = "That file isn’t a Team Log backup. Choose a .json file made by Export backup.";
      }
    } finally {
      if (importEl) importEl.value = "";
    }
  }

  exportBtn?.addEventListener("click", exportBackup);
  importEl?.addEventListener("change", importBackup);

  /* ========== START ========== */
  async function init() {
    const { data: { session } } = await sb.auth.getSession();

    if (session && session.user) {
      currentUser = session.user;
      await loadRunsFromCloud();
      showApp();
      renderAll();
    } else {
      showAuth();
    }

    sb.auth.onAuthStateChange(async function (event) {
      if (event === "SIGNED_OUT") {
        currentUser = null;
        state = { runs: [], activeId: null };
        showAuth();
      }
    });
  }

  init();
});