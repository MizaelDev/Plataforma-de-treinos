"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { exerciseCategories, exerciseDifficultyLevels, exerciseMediaTypes, exerciseModalities } from "@academia/shared";
import { AppShell } from "@/components/app-shell";
import { Alert, Button, EmptyState, LoadingState, MobileRecordCard, SectionCard, StatusBadge, TableToolbar, fieldClass, textareaClass } from "@/components/ui";
import { api } from "@/lib/api";

type ExerciseMediaType = "IMAGE" | "GIF" | "VIDEO" | "EXTERNAL_URL";
type Exercise = {
  id: string;
  name: string;
  category: string;
  modality: string;
  muscleGroup?: string | null;
  description?: string | null;
  executionInstructions?: string | null;
  commonMistakes?: string | null;
  difficultyLevel: string;
  mediaType: ExerciseMediaType;
  mediaUrl: string;
  thumbnailUrl?: string | null;
  isActive: boolean;
};

const initialForm = () => ({
  name: "",
  modality: "Mobilidade",
  category: "Mobilidade de quadril",
  muscleGroup: "",
  description: "",
  executionInstructions: "",
  commonMistakes: "",
  difficultyLevel: "INICIANTE",
  mediaType: "VIDEO" as ExerciseMediaType,
  mediaUrl: "",
  thumbnailUrl: "",
  isActive: true
});

const mediaTypeLabel: Record<ExerciseMediaType, string> = {
  IMAGE: "Imagem",
  GIF: "GIF",
  VIDEO: "Vídeo",
  EXTERNAL_URL: "Link externo"
};

const categoryOptionsByModality: Record<string, string[]> = {
  Musculação: ["Força", "Core", "Cardio"],
  Mobilidade: ["Mobilidade de quadril", "Mobilidade torácica", "Mobilidade de ombro", "Mobilidade de tornozelo", "Mobilidade de coluna"],
  Alongamento: ["Alongamento dinâmico", "Alongamento estático"],
  Funcional: ["Funcional com peso corporal", "Funcional com acessórios", "Core", "Condicionamento"],
  "Muay Thai": ["Técnica", "Condicionamento", "Mobilidade de quadril"],
  Karatê: ["Técnica", "Condicionamento", "Mobilidade de quadril"],
  "Condicionamento físico": ["Cardio", "Condicionamento", "Core"]
};

function categoriesForModality(modality: string, currentCategory?: string) {
  const options = categoryOptionsByModality[modality] ?? [...exerciseCategories];
  if (currentCategory && !options.includes(currentCategory)) {
    return [currentCategory, ...options];
  }
  return options;
}

function mediaAccept(mediaType: ExerciseMediaType) {
  if (mediaType === "VIDEO") return "video/*";
  if (mediaType === "GIF") return "image/gif";
  if (mediaType === "IMAGE") return "image/*";
  return undefined;
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Não foi possível ler o arquivo."));
    reader.readAsDataURL(file);
  });
}

const exercisePresets = [
  {
    label: "Mobilidade de quadril",
    name: "Mobilidade de quadril",
    modality: "Mobilidade",
    category: "Mobilidade de quadril",
    muscleGroup: "Quadril",
    description: "Sequência curta para melhorar amplitude do quadril, controle articular e preparação para agachamentos, passadas e movimentos de luta.",
    executionInstructions: "Execute de forma lenta e controlada, mantendo a respiração constante. Priorize amplitude confortável, sem dor, e aumente o alcance aos poucos.",
    commonMistakes: "Compensar com a lombar, fazer movimentos rápidos demais ou forçar a articulação além do limite confortável.",
    difficultyLevel: "INICIANTE"
  },
  {
    label: "Mobilidade torácica",
    name: "Mobilidade torácica",
    modality: "Mobilidade",
    category: "Mobilidade torácica",
    muscleGroup: "Coluna torácica",
    description: "Exercício para melhorar rotação e extensão torácica, ajudando postura, respiração e movimentos acima da cabeça.",
    executionInstructions: "Mantenha o quadril estável e gire o tronco com controle. Acompanhe o movimento com o olhar e evite prender a respiração.",
    commonMistakes: "Girar apenas o braço, perder estabilidade do quadril ou acelerar a execução.",
    difficultyLevel: "INICIANTE"
  },
  {
    label: "Funcional com peso corporal",
    name: "Agachamento funcional",
    modality: "Funcional",
    category: "Funcional com peso corporal",
    muscleGroup: "Pernas e core",
    description: "Movimento funcional para força de membros inferiores, estabilidade de core e condicionamento geral.",
    executionInstructions: "Mantenha pés firmes, joelhos alinhados e tronco estável. Desça até uma amplitude segura e suba pressionando o chão.",
    commonMistakes: "Projetar joelhos para dentro, arredondar a lombar ou perder controle na descida.",
    difficultyLevel: "INICIANTE"
  }
];

function MediaPreview({ exercise }: { exercise: Pick<Exercise, "mediaType" | "mediaUrl" | "thumbnailUrl" | "name"> }) {
  if (!exercise.mediaUrl) {
    return <div className="flex h-32 items-center justify-center rounded-md border border-dashed border-gray-200 bg-gray-50 text-sm text-muted">Sem mídia</div>;
  }

  if (exercise.mediaType === "IMAGE" || exercise.mediaType === "GIF") {
    return <img src={exercise.mediaUrl} alt={exercise.name} className="h-32 w-full rounded-md border border-gray-200 object-cover" />;
  }

  if (exercise.mediaType === "VIDEO") {
    return <video src={exercise.mediaUrl} poster={exercise.thumbnailUrl ?? undefined} controls className="h-32 w-full rounded-md border border-gray-200 bg-black object-cover" />;
  }

  return (
    <a href={exercise.mediaUrl} target="_blank" rel="noreferrer" className="flex h-32 items-center justify-center rounded-md border border-gray-200 bg-gray-50 px-3 text-center text-sm font-semibold text-brand">
      Abrir link demonstrativo
    </a>
  );
}

export default function ExercisesPage() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("TODOS");
  const [difficultyFilter, setDifficultyFilter] = useState("TODOS");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function load() {
    const payload = await api<{ exercises: Exercise[] }>("/exercises");
    setExercises(payload.exercises);
  }

  useEffect(() => {
    load()
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const filteredExercises = useMemo(() => {
    const term = search.trim().toLowerCase();
    return exercises.filter((exercise) => {
      const matchesSearch = [exercise.name, exercise.category, exercise.modality, exercise.muscleGroup ?? ""].some((value) => value.toLowerCase().includes(term));
      const matchesCategory = categoryFilter === "TODOS" || exercise.category === categoryFilter || exercise.modality === categoryFilter;
      const matchesDifficulty = difficultyFilter === "TODOS" || exercise.difficultyLevel === difficultyFilter;
      return matchesSearch && matchesCategory && matchesDifficulty;
    });
  }, [categoryFilter, difficultyFilter, exercises, search]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);

    try {
      await api(editingId ? `/exercises/${editingId}` : "/exercises", {
        method: editingId ? "PUT" : "POST",
        body: JSON.stringify(form)
      });
      setForm(initialForm());
      setEditingId(null);
      await load();
      setSuccess(editingId ? "Exercício atualizado com sucesso." : "Exercício cadastrado com sucesso.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setSaving(false);
    }
  }

  function editExercise(exercise: Exercise) {
    setEditingId(exercise.id);
    setForm({
      name: exercise.name,
      category: exercise.category,
      modality: exercise.modality,
      muscleGroup: exercise.muscleGroup ?? "",
      description: exercise.description ?? "",
      executionInstructions: exercise.executionInstructions ?? "",
      commonMistakes: exercise.commonMistakes ?? "",
      difficultyLevel: exercise.difficultyLevel,
      mediaType: exercise.mediaType,
      mediaUrl: exercise.mediaUrl,
      thumbnailUrl: exercise.thumbnailUrl ?? "",
      isActive: exercise.isActive
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function applyPreset(preset: (typeof exercisePresets)[number]) {
    setForm((current) => ({
      ...current,
      name: preset.name,
      category: preset.category,
      modality: preset.modality,
      muscleGroup: preset.muscleGroup,
      description: preset.description,
      executionInstructions: preset.executionInstructions,
      commonMistakes: preset.commonMistakes,
      difficultyLevel: preset.difficultyLevel
    }));
  }

  function changeModality(modality: string) {
    const options = categoriesForModality(modality);
    setForm((current) => ({
      ...current,
      modality,
      category: options.includes(current.category) ? current.category : options[0] ?? current.category
    }));
  }

  function changeMediaType(mediaType: ExerciseMediaType) {
    setForm((current) => ({
      ...current,
      mediaType,
      mediaUrl: "",
      thumbnailUrl: ""
    }));
  }

  async function handleMediaFile(file?: File) {
    if (!file) return;
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setForm((current) => ({ ...current, mediaUrl: dataUrl }));
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar o arquivo.");
    }
  }

  async function handleThumbnailFile(file?: File) {
    if (!file) return;
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setForm((current) => ({ ...current, thumbnailUrl: dataUrl }));
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar a thumbnail.");
    }
  }

  async function inactivateExercise(exercise: Exercise) {
    if (!window.confirm(`Inativar o exercício ${exercise.name}?`)) return;
    setError("");
    setSuccess("");

    try {
      await api(`/exercises/${exercise.id}`, { method: "DELETE" });
      await load();
      setSuccess("Exercício inativado com sucesso.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    }
  }

  return (
    <AppShell>
      <header className="mb-6">
        <p className="text-sm font-semibold text-brand">Biblioteca</p>
        <h1 className="mt-1 text-2xl font-semibold text-ink">Biblioteca de Exercícios</h1>
        <p className="mt-1 text-sm text-muted">Cadastre exercícios com vídeo, GIF, imagem ou link externo para reutilizar nas fichas de treino.</p>
      </header>

      {error && <Alert type="error" message={error} />}
      {success && <Alert type="success" message={success} />}

      <SectionCard className="mb-6 p-4">
        <form onSubmit={submit} className="grid gap-4 lg:grid-cols-4">
          <div className="lg:col-span-4">
            <p className="text-sm font-semibold text-ink">Modelos rápidos</p>
            <p className="mt-1 text-sm text-muted">Use um modelo para preencher resumo, instruções e erros comuns. Depois envie o arquivo de mídia ou informe um link externo.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {exercisePresets.map((preset) => (
                <Button key={preset.label} type="button" variant="secondary" className="h-9 px-3" onClick={() => applyPreset(preset)}>
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>
          <label className="text-sm font-medium text-gray-700">
            Nome do exercício
            <input className={fieldClass} value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
          </label>
          <label className="text-sm font-medium text-gray-700">
            Modalidade
            <select className={fieldClass} value={form.modality} onChange={(event) => changeModality(event.target.value)}>
              {exerciseModalities.map((modality) => <option key={modality} value={modality}>{modality}</option>)}
            </select>
          </label>
          <label className="text-sm font-medium text-gray-700">
            Categoria
            <select className={fieldClass} value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}>
              {categoriesForModality(form.modality, form.category).map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
          </label>
          <label className="text-sm font-medium text-gray-700">
            Grupo muscular
            <input className={fieldClass} value={form.muscleGroup} onChange={(event) => setForm((current) => ({ ...current, muscleGroup: event.target.value }))} placeholder="Quadril, ombro, dorsal..." />
          </label>
          <label className="text-sm font-medium text-gray-700">
            Dificuldade
            <select className={fieldClass} value={form.difficultyLevel} onChange={(event) => setForm((current) => ({ ...current, difficultyLevel: event.target.value }))}>
              {exerciseDifficultyLevels.map((level) => <option key={level} value={level}>{level}</option>)}
            </select>
          </label>
          <label className="text-sm font-medium text-gray-700">
            Tipo da mídia
            <select className={fieldClass} value={form.mediaType} onChange={(event) => changeMediaType(event.target.value as ExerciseMediaType)}>
              {exerciseMediaTypes.map((type) => <option key={type} value={type}>{mediaTypeLabel[type]}</option>)}
            </select>
          </label>
          {form.mediaType === "EXTERNAL_URL" ? (
            <label className="text-sm font-medium text-gray-700 lg:col-span-2">
              Link externo
              <input className={fieldClass} value={form.mediaUrl} onChange={(event) => setForm((current) => ({ ...current, mediaUrl: event.target.value }))} placeholder="https://..." />
            </label>
          ) : (
            <label className="text-sm font-medium text-gray-700 lg:col-span-2">
              Arquivo da mídia
              <input
                className={`${fieldClass} file:mr-3 file:rounded-md file:border-0 file:bg-brand file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white`}
                type="file"
                accept={mediaAccept(form.mediaType)}
                onChange={(event) => handleMediaFile(event.target.files?.[0])}
              />
              <span className="mt-1 block text-xs text-muted">{form.mediaUrl ? "Arquivo carregado. Confira o preview abaixo." : "Selecione um arquivo para vídeo, GIF ou imagem."}</span>
            </label>
          )}
          <label className="text-sm font-medium text-gray-700 lg:col-span-2">
            Thumbnail opcional
            <input
              className={`${fieldClass} file:mr-3 file:rounded-md file:border-0 file:bg-brand file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white`}
              type="file"
              accept="image/*"
              onChange={(event) => handleThumbnailFile(event.target.files?.[0])}
            />
            <span className="mt-1 block text-xs text-muted">{form.thumbnailUrl ? "Thumbnail carregada." : "Imagem usada como capa do vídeo ou link externo."}</span>
          </label>
          <label className="flex items-end gap-2 text-sm font-medium text-gray-700">
            <input className="mb-3 h-4 w-4 rounded border-gray-300 text-brand" type="checkbox" checked={form.isActive} onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))} />
            <span className="mb-2">Ativo</span>
          </label>
          <div className="lg:col-span-4">
            <MediaPreview exercise={form} />
          </div>
          <label className="text-sm font-medium text-gray-700 lg:col-span-2">
            Descrição
            <textarea className={textareaClass} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
          </label>
          <label className="text-sm font-medium text-gray-700 lg:col-span-2">
            Instrução de execução
            <textarea className={textareaClass} value={form.executionInstructions} onChange={(event) => setForm((current) => ({ ...current, executionInstructions: event.target.value }))} />
          </label>
          <label className="text-sm font-medium text-gray-700 lg:col-span-4">
            Erros comuns
            <textarea className={textareaClass} value={form.commonMistakes} onChange={(event) => setForm((current) => ({ ...current, commonMistakes: event.target.value }))} />
          </label>
          <div className="flex gap-2 lg:col-span-4">
            <Button type="submit" disabled={saving}>{saving ? "Salvando..." : editingId ? "Atualizar exercício" : "Novo exercício"}</Button>
            {editingId && <Button type="button" variant="secondary" onClick={() => { setEditingId(null); setForm(initialForm()); }}>Cancelar edição</Button>}
          </div>
        </form>
      </SectionCard>

      {loading ? (
        <LoadingState />
      ) : exercises.length === 0 ? (
        <EmptyState title="Nenhum exercício cadastrado" description="Cadastre exercícios demonstrativos para reutilizar nas fichas de treino." />
      ) : (
        <SectionCard className="overflow-hidden">
          <TableToolbar search={search} onSearchChange={setSearch} searchPlaceholder="Buscar por nome, categoria ou grupo muscular">
            <label className="w-full text-sm font-medium text-gray-700 sm:w-52">
              Categoria
              <select className={fieldClass} value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
                <option value="TODOS">Todas</option>
                {exerciseCategories.map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
            </label>
            <label className="w-full text-sm font-medium text-gray-700 sm:w-52">
              Dificuldade
              <select className={fieldClass} value={difficultyFilter} onChange={(event) => setDifficultyFilter(event.target.value)}>
                <option value="TODOS">Todas</option>
                {exerciseDifficultyLevels.map((level) => <option key={level} value={level}>{level}</option>)}
              </select>
            </label>
          </TableToolbar>

          {filteredExercises.length === 0 ? (
            <div className="p-4">
              <EmptyState title="Nenhum exercício encontrado" description="Ajuste a busca ou os filtros para visualizar a biblioteca." />
            </div>
          ) : (
            <>
              <div className="grid gap-3 p-4 md:hidden">
                {filteredExercises.map((exercise) => (
                  <MobileRecordCard key={exercise.id}>
                    <MediaPreview exercise={exercise} />
                    <div className="mt-3 flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-ink">{exercise.name}</p>
                        <p className="mt-1 text-sm text-muted">{exercise.category} - {exercise.muscleGroup || "geral"}</p>
                      </div>
                      <StatusBadge status={exercise.isActive ? "ATIVO" : "INATIVO"} />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <StatusBadge status={exercise.difficultyLevel} />
                      <StatusBadge status={mediaTypeLabel[exercise.mediaType]} />
                    </div>
                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      <Button type="button" variant="secondary" onClick={() => editExercise(exercise)}>Editar</Button>
                      {exercise.isActive && <Button type="button" variant="danger" onClick={() => inactivateExercise(exercise)}>Inativar</Button>}
                    </div>
                  </MobileRecordCard>
                ))}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[980px] text-left text-sm">
                  <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-4 py-3">Exercício</th>
                      <th className="px-4 py-3">Categoria</th>
                      <th className="px-4 py-3">Grupo</th>
                      <th className="px-4 py-3">Dificuldade</th>
                      <th className="px-4 py-3">Mídia</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredExercises.map((exercise) => (
                      <tr key={exercise.id} className="border-t border-gray-100 hover:bg-gray-50/70">
                        <td className="px-4 py-3 font-medium text-ink">{exercise.name}</td>
                        <td className="px-4 py-3 text-gray-600">{exercise.category}</td>
                        <td className="px-4 py-3 text-gray-600">{exercise.muscleGroup || "-"}</td>
                        <td className="px-4 py-3"><StatusBadge status={exercise.difficultyLevel} /></td>
                        <td className="px-4 py-3 text-gray-600">{mediaTypeLabel[exercise.mediaType]}</td>
                        <td className="px-4 py-3"><StatusBadge status={exercise.isActive ? "ATIVO" : "INATIVO"} /></td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <Button type="button" variant="secondary" className="h-8 px-3" onClick={() => editExercise(exercise)}>Editar</Button>
                            {exercise.isActive && <Button type="button" variant="danger" className="h-8 px-3" onClick={() => inactivateExercise(exercise)}>Inativar</Button>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </SectionCard>
      )}
    </AppShell>
  );
}
