const $ = (id) => document.getElementById(id);
const login = $("login");
const editor = $("editor");
const fields = editor.elements;
let page = 1;
let selected = null;

function show(view) {
  document.body.dataset.view = view;
  for (const id of ["login", "catalog", "editor"]) $(id).hidden = id !== view;
  $("logout").hidden = view === "login";
}

function message(value = "", isError = false) {
  $("status").dataset.error = String(isError);
  $("status").textContent = value;
  $("status").hidden = !value;
}

async function request(path, method = "GET", body) {
  const response = await fetch("/admin-api" + path, {
    method,
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (response.status === 204) return;
  const result = await response.json();
  if (response.status === 401) show("login");
  if (!response.ok) throw new Error([result.message ?? "Falha na operação."].flat().join(" "));
  return result;
}

async function run(operation) {
  message();
  try {
    await operation();
  } catch (error) {
    message(error.message, true);
  }
}

function button(label, action, cssClass = "") {
  const element = document.createElement("button");
  element.textContent = label;
  element.className = cssClass;
  element.onclick = () => run(async () => {
    element.disabled = true;
    try { await action(); } finally { element.disabled = false; }
  });
  return element;
}

async function list(target = page) {
  const result = await request("/receitas?page=" + target);
  if (!result.items.length && target > 1) return list(target - 1);
  page = target;
  $("recipes").replaceChildren(...result.items.map((recipe) => {
    const row = document.createElement("li");
    row.className = "toolbar";
    const text = document.createElement("div");
    text.className = "recipe-info";
    const title = document.createElement("strong");
    title.textContent = recipe.titulo;
    const details = document.createElement("small");
    details.className = "recipe-meta";
    const kind = document.createElement("span");
    const official = recipe.tipo === "oficial";
    kind.className = official ? "recipe-kind official" : "recipe-kind";
    kind.textContent = official ? "Oficial" : "De usuário";
    details.append(kind, recipe.categoria);
    text.append(title, details);
    const actions = document.createElement("div");
    actions.className = "recipe-actions";
    actions.append(
      button("Editar", async () => openEditor(await request("/receitas/" + recipe.id))),
      button("Excluir", async () => {
        if (!confirm('Excluir a receita "' + recipe.titulo + '"?')) return;
        await request("/receitas/" + recipe.id, "DELETE");
        await list();
        message("Receita excluída.");
      }, "danger"),
    );
    row.append(text, actions);
    return row;
  }));
  $("total").textContent = result.total === 1 ? "1 receita cadastrada" : result.total + " receitas cadastradas";
  $("page").textContent = result.total ? "Página " + page + " de " + result.totalPages : "Nenhuma receita";
  $("prev").disabled = page <= 1;
  $("next").disabled = page >= result.totalPages;
  show("catalog");
}

function addIngredient(data = {}) {
  const row = $("ingredient").content.firstElementChild.cloneNode(true);
  for (const field of row.querySelectorAll("[data-field]")) {
    const value = data[field.dataset.field];
    if (field.type === "checkbox") field.checked = Boolean(value);
    else field.value = value ?? "";
  }
  row.querySelector("[data-remove]").onclick = () => {
    if ($("ingredients").childElementCount > 1) row.remove();
  };
  $("ingredients").append(row);
}

function openEditor(recipe = null) {
  selected = recipe;
  editor.reset();
  $("editor-title").textContent = recipe ? "Editar receita" : "Nova receita oficial";
  $("ingredients").replaceChildren();
  if (recipe) {
    for (const key of ["titulo", "categoria", "porcoes", "dificuldade", "custo", "imagemPath", "descricao", "descricaoCompleta"]) {
      fields.namedItem(key).value = recipe[key] ?? "";
    }
    fields.namedItem("tempo").value = recipe.tempoMinutos;
    fields.namedItem("tags").value = recipe.tags.join(", ");
    fields.namedItem("modoPreparo").value = recipe.modoPreparo.join("\n");
  }
  const ingredients = recipe?.ingredientesDetalhados;
  (ingredients?.length ? ingredients : [{}]).forEach(addIngredient);
  show("editor");
  fields.namedItem("titulo").focus();
}

login.onsubmit = (event) => {
  event.preventDefault();
  run(async () => {
    const data = Object.fromEntries(new FormData(login));
    await request("/login", "POST", data);
    login.reset();
    await list(1);
  });
};

editor.onsubmit = (event) => {
  event.preventDefault();
  const submit = editor.querySelector("button.primary");
  run(async () => {
    submit.disabled = true;
    try {
      const data = Object.fromEntries(new FormData(editor));
      data.tempo = Number(data.tempo);
      if (data.porcoes) data.porcoes = Number(data.porcoes);
      else if (selected?.porcoes != null) data.porcoes = null;
      else delete data.porcoes;
      data.tags = data.tags.split(",").map((tag) => tag.trim()).filter(Boolean);
      data.modoPreparo = data.modoPreparo.split(/\r?\n/).map((step) => step.trim()).filter(Boolean);
      data.ingredientesDetalhados = Array.from($("ingredients").children, (row) =>
        Object.fromEntries(Array.from(row.querySelectorAll("[data-field]"), (field) => [
          field.dataset.field,
          field.type === "checkbox" ? field.checked :
            field.type === "number" ? (field.value ? field.valueAsNumber : null) : field.value.trim() || null,
        ])),
      );
      await request(selected ? "/receitas/" + selected.id : "/receitas", selected ? "PATCH" : "POST", data);
      await list(selected ? page : 1);
      message("Receita salva.");
    } finally {
      submit.disabled = false;
    }
  });
};

$("new").onclick = () => run(() => openEditor());
$("cancel").onclick = () => run(() => list());
$("prev").onclick = () => run(() => list(page - 1));
$("next").onclick = () => run(() => list(page + 1));
$("add-ingredient").onclick = () => addIngredient();
$("logout").onclick = () => run(async () => {
  await request("/logout", "POST");
  $("recipes").replaceChildren();
  show("login");
});

try {
  await request("/session");
  await run(() => list());
} catch {
  show("login");
}
