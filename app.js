const KEY = "hearthline.v1";

const seed = () => ({
  household: { name: "The Natividad Hearth", city: "Rancho Cucamonga" },
  people: [
    { id: id(), name: "Parent", role: "Care receiver", notes: "Primary person we keep continuity for.", conditions: "List diagnoses here", allergies: "" },
    { id: id(), name: "You", role: "Primary keeper", notes: "Owns the ledger.", conditions: "", allergies: "" }
  ],
  ledger: [
    { id: id(), at: new Date().toISOString(), kind: "promise", person: "You", title: "Set up the household ledger", body: "Write what was said, who promised what, and keep the paper trail here." }
  ],
  meds: [],
  checkins: [],
  emergency: {
    bloodType: "",
    insurance: "",
    physician: "",
    hospital: "",
    directives: "Location of advance directive / POLST",
    firstAid: "Bleeding: pressure. Choking: Heimlich. Chest pain: sit, aspirin if advised, call emergency services. Do not rely on this app as medical care.",
    numbers: [
      { label: "Emergency services", value: "911" },
      { label: "Poison control (US)", value: "1-800-222-1222" }
    ]
  },
  block: []
});

function id() {
  return Math.random().toString(36).slice(2, 10);
}

function storageOk() {
  try {
    localStorage.setItem("hearthline.ping", "1");
    localStorage.removeItem("hearthline.ping");
    return true;
  } catch (e) { return false; }
}

function load() {
  try {
    const raw = storageOk() ? localStorage.getItem(KEY) : null;
    if (!raw) return seed();
    const parsed = JSON.parse(raw);
    const base = seed();
    return {
      ...base,
      ...parsed,
      household: { ...base.household, ...(parsed.household || {}) },
      emergency: { ...base.emergency, ...(parsed.emergency || {}), numbers: (parsed.emergency && parsed.emergency.numbers) || base.emergency.numbers },
      people: parsed.people || base.people,
      ledger: parsed.ledger || base.ledger,
      meds: parsed.meds || [],
      checkins: parsed.checkins || [],
      block: parsed.block || []
    };
  } catch {
    return seed();
  }
}

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
}

let state = load();
let view = "home";

const $ = (s) => document.querySelector(s);
const views = {
  home: { title: "Hearth", sub: "What the household needs to remember." },
  people: { title: "People", sub: "Roles, not accounts." },
  ledger: { title: "Ledger", sub: "What was said. Who promised. What happened." },
  meds: { title: "Meds", sub: "Names, doses, last given. Not a pharmacy." },
  checkins: { title: "Check-ins", sub: "A pulse the keepers can see." },
  emergency: { title: "Emergency pack", sub: "Works when the tower does not." },
  block: { title: "The block", sub: "Named humans. Spare keys. No marketplace." }
};

function setNet() {
  const pill = $("#net-pill");
  if (!pill) return;
  const on = navigator.onLine;
  pill.textContent = on ? "Online" : "Offline — local only";
  pill.className = "pill " + (on ? "online" : "offline");
}

function openModal(html) {
  $("#modal-card").innerHTML = html;
  $("#modal").classList.remove("hidden");
}
function closeModal() {
  $("#modal").classList.add("hidden");
}

function formVal(form, name) {
  return form.elements[name].value.trim();
}

function personOptions() {
  return state.people.map((p) => `<option>${escapeHtml(p.name)}</option>`).join("");
}

function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/"/g, """);
}

function ago(iso) {
  if (!iso) return "never";
  const ms = Date.now() - new Date(iso).getTime();
  const h = Math.floor(ms / 3600000);
  if (h < 1) return "just now";
  if (h < 24) return h + "h ago";
  return Math.floor(h / 24) + "d ago";
}

function renderHome() {
  const lastCheck = state.checkins[0];
  const overdueMeds = state.meds.filter((m) => m.nextDue && new Date(m.nextDue) < new Date()).length;
  $("#view-home").innerHTML = `
    <div class="grid cols-3">
      <div class="card"><h3>People</h3><div class="stat">${state.people.length}</div><p class="muted">Keepers and receivers</p></div>
      <div class="card"><h3>Open promises</h3><div class="stat">${state.ledger.filter(l => l.kind === "promise").length}</div><p class="muted">Written so they are not lost</p></div>
      <div class="card"><h3>Last check-in</h3><div class="stat">${lastCheck ? ago(lastCheck.at) : "—"}</div><p class="muted">${lastCheck ? escapeHtml(lastCheck.person) : "None yet"}</p></div>
    </div>
    <div class="grid cols-2" style="margin-top:16px">
      <div class="card">
        <h3>Tonight</h3>
        <p class="muted">${overdueMeds ? overdueMeds + " med window(s) past due." : "No overdue med windows."} ${state.block.length ? state.block.length + " neighbors on the block." : "No neighbors named yet."}</p>
        <div class="actions">
          <button class="primary" data-go="checkins">Log a check-in</button>
          <button data-go="emergency">Open emergency pack</button>
        </div>
      </div>
      <div class="card">
        <h3>Household</h3>
        <p class="muted">${escapeHtml(state.household.name)} · ${escapeHtml(state.household.city || "unplaced")}</p>
        <div class="actions">
          <button id="rename-house">Rename</button>
        </div>
      </div>
    </div>
    <div class="card" style="margin-top:16px">
      <h3>Latest ledger</h3>
      <div class="list">${state.ledger.slice(0, 5).map(ledgerItem).join("") || "<p class='muted'>Empty.</p>"}</div>
    </div>
  `;
  $("#rename-house").onclick = () => {
    openModal(`
      <h2>Household</h2>
      <form id="house-form">
        <div class="field"><label>Name</label><input name="name" value="${escapeHtml(state.household.name)}" /></div>
        <div class="field"><label>City</label><input name="city" value="${escapeHtml(state.household.city)}" /></div>
        <div class="actions"><button class="primary" type="submit">Save</button><button type="button" id="cancel">Cancel</button></div>
      </form>
    `);
    $("#cancel").onclick = closeModal;
    $("#house-form").onsubmit = (e) => {
      e.preventDefault();
      state.household.name = formVal(e.target, "name") || "Unnamed household";
      state.household.city = formVal(e.target, "city");
      persist();
      closeModal();
    };
  };
}

function ledgerItem(l) {
  return `<div class="item"><span class="tag">${escapeHtml(l.kind)}</span><strong>${escapeHtml(l.title)}</strong><span class="muted">${escapeHtml(l.person)} · ${ago(l.at)}</span><p class="muted">${escapeHtml(l.body)}</p></div>`;
}

function renderPeople() {
  $("#view-people").innerHTML = `
    <div class="actions" style="margin-bottom:16px"><button class="primary" id="add-person">Add person</button></div>
    <div class="list">${state.people.map(p => `
      <div class="item">
        <span class="tag">${escapeHtml(p.role)}</span>
        <strong>${escapeHtml(p.name)}</strong>
        <p class="muted">${escapeHtml(p.notes)}</p>
        <p class="muted">Conditions: ${escapeHtml(p.conditions) || "—"} · Allergies: ${escapeHtml(p.allergies) || "—"}</p>
        <div class="actions"><button data-edit="${p.id}">Edit</button><button class="danger" data-del="${p.id}">Remove</button></div>
      </div>
    `).join("")}</div>
  `;
  $("#add-person").onclick = () => personModal();
  $("#view-people").querySelectorAll("[data-edit]").forEach((b) => b.onclick = () => personModal(state.people.find(p => p.id === b.dataset.edit)));
  $("#view-people").querySelectorAll("[data-del]").forEach((b) => b.onclick = () => {
    state.people = state.people.filter(p => p.id !== b.dataset.del);
    persist();
  });
}

function personModal(p) {
  const x = p || { name: "", role: "Keeper", notes: "", conditions: "", allergies: "" };
  openModal(`
    <h2>${p ? "Edit person" : "Add person"}</h2>
    <form id="p-form">
      <div class="field"><label>Name</label><input name="name" value="${escapeHtml(x.name)}" required /></div>
      <div class="field"><label>Role</label><input name="role" value="${escapeHtml(x.role)}" /></div>
      <div class="field"><label>Notes</label><textarea name="notes">${escapeHtml(x.notes)}</textarea></div>
      <div class="field"><label>Conditions</label><input name="conditions" value="${escapeHtml(x.conditions)}" /></div>
      <div class="field"><label>Allergies</label><input name="allergies" value="${escapeHtml(x.allergies)}" /></div>
      <div class="actions"><button class="primary" type="submit">Save</button><button type="button" id="cancel">Cancel</button></div>
    </form>
  `);
  $("#cancel").onclick = closeModal;
  $("#p-form").onsubmit = (e) => {
    e.preventDefault();
    const row = {
      id: p ? p.id : id(),
      name: formVal(e.target, "name"),
      role: formVal(e.target, "role"),
      notes: formVal(e.target, "notes"),
      conditions: formVal(e.target, "conditions"),
      allergies: formVal(e.target, "allergies")
    };
    if (p) state.people = state.people.map((n) => n.id === p.id ? row : n);
    else state.people.push(row);
    persist();
    closeModal();
  };
}

function renderLedger() {
  $("#view-ledger").innerHTML = `
    <div class="actions" style="margin-bottom:16px"><button class="primary" id="add-led">Add entry</button></div>
    <div class="list">${state.ledger.map(ledgerItem).join("") || "<p class='muted'>Nothing written yet.</p>"}</div>
  `;
  $("#add-led").onclick = () => {
    openModal(`
      <h2>Ledger entry</h2>
      <form id="l-form">
        <div class="field"><label>Kind</label>
          <select name="kind"><option>note</option><option>visit</option><option>promise</option><option>decision</option><option>photo note</option></select>
        </div>
        <div class="field"><label>Who</label><select name="person">${personOptions()}</select></div>
        <div class="field"><label>Title</label><input name="title" required /></div>
        <div class="field"><label>What happened</label><textarea name="body"></textarea></div>
        <div class="actions"><button class="primary" type="submit">Save</button><button type="button" id="cancel">Cancel</button></div>
      </form>
    `);
    $("#cancel").onclick = closeModal;
    $("#l-form").onsubmit = (e) => {
      e.preventDefault();
      state.ledger.unshift({
        id: id(),
        at: new Date().toISOString(),
        kind: formVal(e.target, "kind"),
        person: formVal(e.target, "person"),
        title: formVal(e.target, "title"),
        body: formVal(e.target, "body")
      });
      persist();
      closeModal();
    };
  };
}

function renderMeds() {
  $("#view-meds").innerHTML = `
    <div class="actions" style="margin-bottom:16px"><button class="primary" id="add-med">Add medication</button></div>
    <div class="list">${state.meds.map(m => {
      const late = m.nextDue && new Date(m.nextDue) < new Date();
      return `<div class="item">
        <strong>${escapeHtml(m.name)}</strong>
        <p class="muted">${escapeHtml(m.dose)} · ${escapeHtml(m.schedule)} · for ${escapeHtml(m.person)}</p>
        <p class="${late ? "overdue" : "muted"}">Last given: ${m.lastGiven ? ago(m.lastGiven) : "never"} · Next: ${m.nextDue ? new Date(m.nextDue).toLocaleString() : "—"}</p>
        <div class="actions">
          <button data-give="${m.id}">Mark given now</button>
          <button class="danger" data-del="${m.id}">Remove</button>
        </div>
      </div>`;
    }).join("") || "<p class='muted'>No medications recorded.</p>"}</div>
  `;
  $("#add-med").onclick = () => {
    openModal(`
      <h2>Medication</h2>
      <form id="m-form">
        <div class="field"><label>Name</label><input name="name" required /></div>
        <div class="field"><label>Dose</label><input name="dose" placeholder="5mg" /></div>
        <div class="field"><label>Schedule</label><input name="schedule" placeholder="morning and night" /></div>
        <div class="field"><label>Hours between doses</label><input name="hours" type="number" value="12" /></div>
        <div class="field"><label>Person</label><select name="person">${personOptions()}</select></div>
        <div class="actions"><button class="primary" type="submit">Save</button><button type="button" id="cancel">Cancel</button></div>
      </form>
    `);
    $("#cancel").onclick = closeModal;
    $("#m-form").onsubmit = (e) => {
      e.preventDefault();
      state.meds.push({
        id: id(),
        name: formVal(e.target, "name"),
        dose: formVal(e.target, "dose"),
        schedule: formVal(e.target, "schedule"),
        hours: Number(formVal(e.target, "hours") || 12),
        person: formVal(e.target, "person"),
        lastGiven: null,
        nextDue: null
      });
      persist();
      closeModal();
    };
  };
  $("#view-meds").querySelectorAll("[data-give]").forEach((b) => b.onclick = () => {
    const m = state.meds.find((x) => x.id === b.dataset.give);
    const now = new Date();
    m.lastGiven = now.toISOString();
    m.nextDue = new Date(now.getTime() + m.hours * 3600000).toISOString();
    state.ledger.unshift({
      id: id(), at: m.lastGiven, kind: "note", person: m.person,
      title: "Gave " + m.name, body: m.dose + " recorded in Hearthline."
    });
    persist();
  });
  $("#view-meds").querySelectorAll("[data-del]").forEach((b) => b.onclick = () => {
    state.meds = state.meds.filter((x) => x.id !== b.dataset.del);
    persist();
  });
}

function renderCheckins() {
  $("#view-checkins").innerHTML = `
    <div class="card">
      <h3>How is the house</h3>
      <form id="c-form" class="grid">
        <div class="field"><label>Who</label><select name="person">${personOptions()}</select></div>
        <div class="field"><label>Status</label>
          <select name="status"><option>ok</option><option>tired</option><option>pain</option><option>confused</option><option>needs help</option></select>
        </div>
        <div class="field"><label>Note</label><input name="note" placeholder="Ate, walked, slept…" /></div>
        <button class="primary" type="submit">Record check-in</button>
      </form>
    </div>
    <div class="list" style="margin-top:16px">${state.checkins.map(c => `
      <div class="item"><span class="tag">${escapeHtml(c.status)}</span><strong>${escapeHtml(c.person)}</strong><span class="muted"> ${ago(c.at)}</span><p class="muted">${escapeHtml(c.note)}</p></div>
    `).join("") || "<p class='muted'>No check-ins yet. The silence is the signal.</p>"}</div>
  `;
  $("#c-form").onsubmit = (e) => {
    e.preventDefault();
    state.checkins.unshift({
      id: id(),
      at: new Date().toISOString(),
      person: formVal(e.target, "person"),
      status: formVal(e.target, "status"),
      note: formVal(e.target, "note")
    });
    persist();
  };
}

function renderEmergency() {
  const e = state.emergency;
  $("#view-emergency").innerHTML = `
    <div class="grid cols-2">
      <div class="card">
        <h3>Medical card</h3>
        <p class="muted">Blood: ${escapeHtml(e.bloodType) || "—"}</p>
        <p class="muted">Insurance: ${escapeHtml(e.insurance) || "—"}</p>
        <p class="muted">Physician: ${escapeHtml(e.physician) || "—"}</p>
        <p class="muted">Hospital: ${escapeHtml(e.hospital) || "—"}</p>
        <p class="muted">Directives: ${escapeHtml(e.directives) || "—"}</p>
        <div class="actions"><button id="edit-em">Edit card</button></div>
      </div>
      <div class="card">
        <h3>Numbers that must work offline</h3>
        <div class="list">${e.numbers.map(n => `<div class="item"><strong>${escapeHtml(n.label)}</strong><p>${escapeHtml(n.value)}</p></div>`).join("")}</div>
        <div class="actions"><button id="add-num">Add number</button></div>
      </div>
    </div>
    <div class="card" style="margin-top:16px">
      <h3>First aid that stays on the device</h3>
      <p>${escapeHtml(e.firstAid)}</p>
      <p class="muted">This is a reminder card, not a clinician. When towers die, paper and this screen are the same thing: what you stored before the dark.</p>
    </div>
  `;
  $("#edit-em").onclick = () => {
    openModal(`
      <h2>Medical card</h2>
      <form id="e-form">
        <div class="field"><label>Blood type</label><input name="bloodType" value="${escapeHtml(e.bloodType)}" /></div>
        <div class="field"><label>Insurance</label><input name="insurance" value="${escapeHtml(e.insurance)}" /></div>
        <div class="field"><label>Physician</label><input name="physician" value="${escapeHtml(e.physician)}" /></div>
        <div class="field"><label>Preferred hospital</label><input name="hospital" value="${escapeHtml(e.hospital)}" /></div>
        <div class="field"><label>Directives</label><textarea name="directives">${escapeHtml(e.directives)}</textarea></div>
        <div class="field"><label>First aid notes</label><textarea name="firstAid">${escapeHtml(e.firstAid)}</textarea></div>
        <div class="actions"><button class="primary" type="submit">Save</button><button type="button" id="cancel">Cancel</button></div>
      </form>
    `);
    $("#cancel").onclick = closeModal;
    $("#e-form").onsubmit = (ev) => {
      ev.preventDefault();
      Object.assign(state.emergency, {
        bloodType: formVal(ev.target, "bloodType"),
        insurance: formVal(ev.target, "insurance"),
        physician: formVal(ev.target, "physician"),
        hospital: formVal(ev.target, "hospital"),
        directives: formVal(ev.target, "directives"),
        firstAid: formVal(ev.target, "firstAid")
      });
      persist();
      closeModal();
    };
  };
  $("#add-num").onclick = () => {
    openModal(`
      <h2>Number</h2>
      <form id="n-form">
        <div class="field"><label>Label</label><input name="label" required /></div>
        <div class="field"><label>Value</label><input name="value" required /></div>
        <div class="actions"><button class="primary" type="submit">Save</button><button type="button" id="cancel">Cancel</button></div>
      </form>
    `);
    $("#cancel").onclick = closeModal;
    $("#n-form").onsubmit = (ev) => {
      ev.preventDefault();
      state.emergency.numbers.push({ label: formVal(ev.target, "label"), value: formVal(ev.target, "value") });
      persist();
      closeModal();
    };
  };
}

function renderBlock() {
  $("#view-block").innerHTML = `
    <p class="muted">Opt-in neighbors only. No feed. No ratings marketplace. A name, what they offered, how to reach them when the app store is a rumor.</p>
    <div class="actions" style="margin:16px 0"><button class="primary" id="add-n">Name a neighbor</button></div>
    <div class="list">${state.block.map(n => `
      <div class="item">
        <strong>${escapeHtml(n.name)}</strong>
        <p class="muted">${escapeHtml(n.offer)} · ${escapeHtml(n.reach)}</p>
        <div class="actions"><button class="danger" data-del="${n.id}">Remove</button></div>
      </div>
    `).join("") || "<p class='muted'>The block is empty. Name one person who would come.</p>"}</div>
  `;
  $("#add-n").onclick = () => {
    openModal(`
      <h2>Neighbor</h2>
      <form id="b-form">
        <div class="field"><label>Name</label><input name="name" required /></div>
        <div class="field"><label>What they offered</label><input name="offer" placeholder="spare key, generator, ride" /></div>
        <div class="field"><label>How to reach</label><input name="reach" placeholder="gate code, number, window" /></div>
        <div class="actions"><button class="primary" type="submit">Save</button><button type="button" id="cancel">Cancel</button></div>
      </form>
    `);
    $("#cancel").onclick = closeModal;
    $("#b-form").onsubmit = (e) => {
      e.preventDefault();
      state.block.push({
        id: id(),
        name: formVal(e.target, "name"),
        offer: formVal(e.target, "offer"),
        reach: formVal(e.target, "reach")
      });
      persist();
      closeModal();
    };
  };
  $("#view-block").querySelectorAll("[data-del]").forEach((b) => b.onclick = () => {
    state.block = state.block.filter((n) => n.id !== b.dataset.del);
    persist();
  });
}

function persist() {
  save();
  paint();
}

function paint() {
  Object.keys(views).forEach((k) => {
    $("#view-" + k).classList.toggle("hidden", k !== view);
  });
  document.querySelectorAll(".rail nav button").forEach((b) => {
    b.classList.toggle("active", b.dataset.view === view);
  });
  $("#view-title").textContent = views[view].title;
  $("#view-sub").textContent = views[view].sub;
  $("#household-chip").textContent = state.household.name;
  const renderers = { home: renderHome, people: renderPeople, ledger: renderLedger, meds: renderMeds, checkins: renderCheckins, emergency: renderEmergency, block: renderBlock };
  renderers[view]();
  document.querySelectorAll("[data-go]").forEach((b) => {
    b.onclick = () => { view = b.dataset.go; paint(); };
  });
}

document.querySelectorAll(".rail nav button").forEach((b) => {
  b.onclick = () => {
    view = b.dataset.view;
    $("#rail").classList.remove("open");
    paint();
  };
});
$("#menu-btn").onclick = () => $("#rail").classList.toggle("open");
$("#modal").addEventListener("click", (e) => {
  if (e.target.id === "modal") closeModal();
});

$("#export-btn").onclick = () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "hearthline-household.json";
  a.click();
};
$("#import-file").onchange = (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      state = { ...seed(), ...JSON.parse(reader.result) };
      persist();
    } catch {
      openModal("<h2>Import failed</h2><p class='muted'>That file was not a Hearthline household.</p><button id='cancel'>Close</button>");
      $("#cancel").onclick = closeModal;
    }
  };
  reader.readAsText(file);
};

window.addEventListener("online", setNet);
window.addEventListener("offline", setNet);
setNet();
paint();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
