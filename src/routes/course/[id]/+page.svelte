<script lang="ts">
    import type { PageProps } from "./$types";
    import { grades, computeEffectiveCompPct, computeEffectiveSubPct, getScaleTargetPct } from "$lib/stores/grades.svelte";
    import { getGradeColor, getLetterGrade } from "$lib/grading";
    import { predictGrade } from "$lib/curveGrading";
    import { tick } from "svelte";
    import { goto } from "$app/navigation";

    let { data }: PageProps = $props();

    const course = $derived(grades.getCourse(data.courseId));
    const proj = $derived(grades.projectedGrade(data.courseId));
    const totalWeight = $derived(grades.totalWeight(data.courseId));

    let expanded = $state<Set<string>>(new Set());
    function toggle(id: string) {
        const next = new Set(expanded);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        expanded = next;
    }

    let statsOpen = $state<Set<string>>(new Set());
    function toggleStats(id: string) {
        const next = new Set(statsOpen);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        statsOpen = next;
    }

    let confirmReset = $state(false);
    let editingName = $state<string | null>(null);
    let editingSubName = $state<string | null>(null);

    const gradeColor = $derived(getGradeColor(proj.grade));
    const curved = $derived(grades.curvedGrade(data.courseId));

    function handleClassStat(compId: string, field: 'classAvg' | 'classMedian' | 'classMax' | 'classStdDev', val: string) {
        const num = val === "" ? null : parseFloat(val);
        if (num === null || (!isNaN(num) && num >= 0))
            grades.updateClassStats(data.courseId, compId, field, num);
    }

    function handleSubClassStat(compId: string, subId: string, field: 'classAvg' | 'classMedian' | 'classMax' | 'classStdDev', val: string) {
        const num = val === "" ? null : parseFloat(val);
        if (num === null || (!isNaN(num) && num >= 0))
            grades.updateSubClassStats(data.courseId, compId, subId, field, num);
    }

    let subStatsOpen = $state<Set<string>>(new Set());
    function toggleSubStats(id: string) {
        const next = new Set(subStatsOpen);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        subStatsOpen = next;
    }

    function handleScore(compId: string, val: string) {
        const num = val === "" ? null : parseFloat(val);
        if (num === null || (!isNaN(num) && num >= 0))
            grades.updateScore(data.courseId, compId, num);
    }

    function handleSubScore(compId: string, subId: string, val: string) {
        const num = val === "" ? null : parseFloat(val);
        if (num === null || (!isNaN(num) && num >= 0))
            grades.updateSubScore(data.courseId, compId, subId, num);
    }

    function handleSubMax(compId: string, subId: string, val: string) {
        const num = parseFloat(val);
        if (!isNaN(num) && num > 0)
            grades.updateSubMaxScore(data.courseId, compId, subId, num);
    }

    function handleWeight(compId: string, val: string) {
        const num = parseFloat(val);
        if (!isNaN(num) && num >= 0 && num <= 100)
            grades.updateWeight(data.courseId, compId, num);
    }

    function handleMax(compId: string, val: string) {
        const num = parseFloat(val);
        if (!isNaN(num) && num > 0)
            grades.updateMaxScore(data.courseId, compId, num);
    }

    function handleScaleTarget(compId: string, val: string) {
        grades.updateScaleTarget(data.courseId, compId, val || null);
    }

    function handleSubScaleTarget(compId: string, subId: string, val: string) {
        grades.updateSubScaleTarget(data.courseId, compId, subId, val || null);
    }

    function handleBestOf(compId: string, val: string, total: number) {
        const num = parseInt(val);
        if (val === "" || isNaN(num))
            grades.updateBestOf(data.courseId, compId, undefined);
        else if (num > 0 && num <= total)
            grades.updateBestOf(data.courseId, compId, num);
    }

    let deletingCourse = $state(false);

    async function handleDeleteCourse() {
        if (deletingCourse) return;
        const name = course?.name ?? "this course";
        const ok = confirm(`Delete ${name}?`);
        if (!ok) return;
        deletingCourse = true;
        await grades.deleteCourse(data.courseId);
        goto("/");
    }

    function focusOnMount(node: HTMLElement) {
        tick().then(() => node.focus());
        return {};
    }

    function getCompPrediction(pct: number | null, comp: { classAvg?: number | null; classMedian?: number | null; classMax?: number | null; classStdDev?: number | null; maxScore: number }) {
        if (pct === null || comp.classAvg == null) return null;
        const score = (pct / 100) * comp.maxScore;
        return predictGrade(score, comp.maxScore, comp.classAvg, {
            median: comp.classMedian,
            max: comp.classMax,
            stdDev: comp.classStdDev,
        });
    }
</script>

{#if course}
<div class="page">
    <header class="header">
        <div class="header-inner">
            <div class="nav-left">
                <button class="back-btn mono" onclick={() => goto("/")}
                    >← back</button
                >
                <div class="breadcrumb mono">
                    <span style="color: oklch(0.4 0.02 265)">tracksem /</span>
                    <span style="color: {course.color}">{course.name}</span>
                </div>
            </div>
            <div class="header-actions">
                {#if confirmReset}
                    <span class="mono text-xs" style="color: #fb923c"
                        >reset to defaults?</span
                    >
                    <button
                        class="action-btn danger mono text-xs"
                        onclick={async () => {
                            await grades.resetCourse(data.courseId);
                            confirmReset = false;
                        }}>yes</button
                    >
                    <button
                        class="action-btn mono text-xs"
                        onclick={() => (confirmReset = false)}>no</button
                    >
                {:else}
                    <button
                        class="action-btn mono text-xs"
                        onclick={() => (confirmReset = true)}>reset</button
                    >
                {/if}
                <button
                    class="action-btn danger mono text-xs"
                    disabled={deletingCourse}
                    onclick={handleDeleteCourse}
                    >{deletingCourse ? "deleting..." : "delete course"}</button
                >
                <button
                    class="action-btn add mono text-xs"
                    onclick={() => grades.addComponent(data.courseId)}
                    >+ add component</button
                >
            </div>
        </div>
    </header>

    <main class="main">
        <!-- Grade hero -->
        <div class="hero" style="--accent: {course.color}">
            <div class="hero-left">
                <div
                    class="course-chip mono"
                    style="color: {course.color}; border-color: {course.color}30"
                >
                    {course.name}
                </div>
                <h1 class="course-fullname">{course.fullName}</h1>
                <div class="meta mono">
                    {proj.filled}/{proj.total} components graded
                    {#if totalWeight !== 100}
                        · <span style="color: #fb923c"
                            >⚠ weights sum to {totalWeight}%</span
                        >
                    {:else}
                        · <span style="color: oklch(0.4 0.02 265)"
                            >weights OK</span
                        >
                    {/if}
                </div>
            </div>
            <div class="hero-grade">
                <div class="hero-grade-row">
                    <div class="hero-grade-col">
                        <div class="letter-grade mono" style="color: {gradeColor}">
                            {getLetterGrade(proj.grade)}
                        </div>
                        {#if proj.grade !== null}
                            <div class="pct-grade mono" style="color: {gradeColor}">
                                {proj.grade.toFixed(2)}%
                            </div>
                            <div class="grade-note">absolute</div>
                        {:else}
                            <div class="grade-note">enter scores to see projection</div>
                        {/if}
                    </div>
                    {#if curved}
                        <div class="hero-grade-divider"></div>
                        <div class="hero-grade-col">
                            <div class="letter-grade curved-letter mono" style="color: {curved.color}">
                                {curved.letter}
                            </div>
                            <div class="pct-grade mono" style="color: {curved.color}">
                                P{curved.percentile.toFixed(0)}
                            </div>
                            <div class="grade-note">curved</div>
                        </div>
                    {/if}
                </div>
            </div>
        </div>

        <div class="section-label mono">// components</div>

        <div class="comp-list">
            {#each course.components as comp (comp.id)}
                {@const scaledPct = getScaleTargetPct(course, comp.scaleTargetId)}
                {@const pct = computeEffectiveCompPct(course, comp)}
                {@const barColor = getGradeColor(pct)}
                {@const contrib =
                    pct !== null ? (pct * comp.weight) / 100 : null}
                {@const hasSubItems = comp.subItems && comp.subItems.length > 0}
                {@const isOpen = expanded.has(comp.id)}
                {@const isStatsOpen = statsOpen.has(comp.id)}
                {@const compPred = comp.scaleTargetId ? null : getCompPrediction(pct, comp)}
                {@const hasAnyStats = !comp.scaleTargetId && comp.classAvg != null}

                <div class="comp-card" class:expanded={isOpen}>
                    <div class="comp-row">
                        <!-- Expand toggle -->
                        <button
                            class="expand-btn"
                            class:has-sub={hasSubItems}
                            onclick={() => {
                                if (hasSubItems) {
                                    toggle(comp.id);
                                } else {
                                    grades.addSubItem(data.courseId, comp.id);
                                    expanded = new Set([...expanded, comp.id]);
                                }
                            }}
                        >
                            {#if hasSubItems}
                                <span class="chevron mono" class:open={isOpen}
                                    >›</span
                                >
                            {:else}
                                <span
                                    class="plus-expand mono"
                                    title="add sub-items">⊕</span
                                >
                            {/if}
                        </button>

                        <!-- Name -->
                        <div class="comp-name-cell">
                            {#if editingName === comp.id}
                                <input
                                    class="name-input mono"
                                    value={comp.name}
                                    use:focusOnMount
                                    onblur={(e) => {
                                        grades.updateName(
                                            data.courseId,
                                            comp.id,
                                            (e.target as HTMLInputElement)
                                                .value,
                                        );
                                        editingName = null;
                                    }}
                                    onkeydown={(e) => {
                                        if (e.key === "Enter")
                                            (
                                                e.target as HTMLInputElement
                                            ).blur();
                                    }}
                                />
                            {:else}
                                <button
                                    class="name-display mono"
                                    onclick={() => (editingName = comp.id)}
                                >
                                    {comp.name}
                                    {#if hasSubItems}
                                        <span class="sub-count">
                                            {comp.subItems!.filter(
                                                (s) => s.score !== null,
                                            ).length}/{comp.subItems!.length}
                                            {#if comp.bestOf}· best {comp.bestOf}{/if}
                                        </span>
                                    {/if}
                                    <span class="edit-hint">✏</span>
                                </button>
                            {/if}
                        </div>

                        <!-- Weight -->
                        <div class="comp-cell weight-cell">
                            <input
                                class="num-input mono"
                                type="number"
                                min="0"
                                max="100"
                                step="1"
                                value={comp.weight}
                                oninput={(e) =>
                                    handleWeight(
                                        comp.id,
                                        (e.target as HTMLInputElement).value,
                                    )}
                            />
                            <span class="unit mono">%</span>
                        </div>

                        <!-- Score -->
                        <div class="comp-cell score-cell">
                            {#if comp.scaleTargetId}
                                <div class="scaled-score-control">
                                    <label class="scaled-select-wrap mono">
                                        <span>scaled</span>
                                        <select
                                            class="scaled-select mono"
                                            value={comp.scaleTargetId}
                                            aria-label="change scale target"
                                            onchange={(e) => handleScaleTarget(comp.id, (e.target as HTMLSelectElement).value)}
                                        >
                                            {#each course.components as target}
                                                {#if target.id !== comp.id}
                                                    <option value={target.id}>{target.name}</option>
                                                    {#each target.subItems ?? [] as sub}
                                                        <option value={sub.id}>↳ {target.name} / {sub.name}</option>
                                                    {/each}
                                                {/if}
                                            {/each}
                                        </select>
                                        <span class="scaled-target-label">
                                            {#each course.components as target}
                                                {#if target.id === comp.scaleTargetId}
                                                    {target.name}
                                                {/if}
                                                {#each target.subItems ?? [] as sub}
                                                    {#if sub.id === comp.scaleTargetId}
                                                        ↳ {target.name} / {sub.name}
                                                    {/if}
                                                {/each}
                                            {/each}
                                        </span>
                                    </label>
                                    <button
                                        class="scaled-clear-btn"
                                        title="turn off scaling"
                                        aria-label="turn off scaling"
                                        onclick={() => handleScaleTarget(comp.id, "")}
                                    >×</button>
                                </div>
                            {:else if !hasSubItems}
                                <input
                                    class="num-input mono score-input"
                                    type="number"
                                    min="0"
                                    max={comp.maxScore}
                                    step="0.5"
                                    placeholder="—"
                                    value={comp.score ?? ""}
                                    oninput={(e) =>
                                        handleScore(
                                            comp.id,
                                            (e.target as HTMLInputElement)
                                                .value,
                                        )}
                                />
                                <span class="unit mono">/ </span>
                                <input
                                    class="num-input mono max-input"
                                    type="number"
                                    min="1"
                                    step="1"
                                    value={comp.maxScore}
                                    oninput={(e) =>
                                        handleMax(
                                            comp.id,
                                            (e.target as HTMLInputElement)
                                                .value,
                                        )}
                                />
                            {:else}
                                <button
                                    class="sub-summary mono"
                                    onclick={() => toggle(comp.id)}
                                >
                                    {isOpen ? "▾" : "▸"}
                                    {comp.subItems!.filter(
                                        (s) => s.score !== null,
                                    ).length} of {comp.subItems!.length} entered
                                </button>
                            {/if}
                        </div>

                        <!-- Pct + bar -->
                        <div class="comp-cell pct-cell">
                            {#if pct !== null}
                                <div class="bar-stack">
                                    <div class="bar-track">
                                        <div
                                            class="bar-fill"
                                            style="width: {Math.min(
                                                pct,
                                                100,
                                            )}%; background: {barColor}"
                                        ></div>
                                    </div>
                                    <span
                                        class="mono text-xs"
                                        style="color: {barColor}"
                                        >{pct.toFixed(1)}%</span
                                    >
                                </div>
                            {:else}
                                <span class="mono text-xs dimmed">—</span>
                            {/if}
                        </div>

                        <!-- Contribution -->
                        <div
                            class="comp-cell contrib-cell mono text-xs"
                            style="color: {contrib !== null
                                ? barColor
                                : 'oklch(0.35 0.02 265)'}"
                        >
                            {contrib !== null ? contrib.toFixed(2) + "%" : "—"}
                        </div>

                        <!-- Curved prediction pill -->
                        <div class="comp-cell curve-cell">
                            {#if compPred}
                                <span
                                    class="curve-pill mono"
                                    style="color: {compPred.color}; border-color: {compPred.color}40; background: {compPred.color}12"
                                >
                                    {compPred.letter}
                                    <span class="curve-pctl">P{compPred.percentile.toFixed(0)}</span>
                                </span>
                            {:else if hasAnyStats}
                                <span class="curve-pill mono dimmed" style="border-color: oklch(1 0 0 / 8%)">—</span>
                            {/if}
                        </div>

                        <!-- Stats toggle -->
                        <button
                            class="stats-toggle-btn"
                            class:active={isStatsOpen || hasAnyStats}
                            class:open={isStatsOpen}
                            onclick={() => toggleStats(comp.id)}
                            title="class statistics"
                            aria-label="toggle class statistics"
                            aria-expanded={isStatsOpen}
                        >
                            <svg class="dropdown-icon" viewBox="0 0 16 16" aria-hidden="true">
                                <path d="M4 6l4 4 4-4" />
                            </svg>
                        </button>

                        <!-- Remove -->
                        <button
                            class="remove-btn"
                            onclick={() =>
                                grades.removeComponent(data.courseId, comp.id)}
                            title="remove">×</button
                        >
                    </div>

                    <!-- Sub-items panel -->
                    {#if hasSubItems && isOpen}
                        <div class="sub-panel">
                            <div class="best-of-row mono">
                                <span class="dimmed">scoring:</span>
                                {#if comp.bestOf !== undefined}
                                    best
                                    <input
                                        class="bestof-input mono"
                                        type="number"
                                        min="1"
                                        max={comp.subItems!.length}
                                        value={comp.bestOf}
                                        disabled={!!comp.scaleTargetId}
                                        oninput={(e) =>
                                            handleBestOf(
                                                comp.id,
                                                (e.target as HTMLInputElement)
                                                    .value,
                                                comp.subItems!.length,
                                            )}
                                    />
                                    of {comp.subItems!.length}
                                    <button
                                        class="pill-btn mono"
                                        disabled={!!comp.scaleTargetId}
                                        onclick={() =>
                                            grades.updateBestOf(
                                                data.courseId,
                                                comp.id,
                                                undefined,
                                            )}>→ use all</button
                                    >
                                {:else}
                                    average of all {comp.subItems!.length}
                                    <button
                                        class="pill-btn mono"
                                        disabled={!!comp.scaleTargetId}
                                        onclick={() =>
                                            grades.updateBestOf(
                                                data.courseId,
                                                comp.id,
                                                Math.max(
                                                    1,
                                                    comp.subItems!.length - 1,
                                                ),
                                            )}>→ set best-of</button
                                    >
                                {/if}
                                <span class="dimmed" style="margin-left: auto;"
                                    >each worth {comp.subItems!.length > 0
                                        ? (
                                              comp.weight /
                                              comp.subItems!.length
                                          ).toFixed(1)
                                        : "0"}%</span
                                >
                            </div>

                            {#each comp.subItems! as sub (sub.id)}
                                {@const subPct = computeEffectiveSubPct(course, sub)}
                                {@const subColor = getGradeColor(subPct)}
                                {@const isPerSub = comp.statsMode === 'per-sub'}
                                {@const subPred = isPerSub && !sub.scaleTargetId ? getCompPrediction(subPct, sub) : null}
                                {@const isSubStatsOpen = subStatsOpen.has(sub.id)}
                                <div class="sub-row" class:per-sub={isPerSub}>
                                    <div class="sub-name-cell">
                                        {#if editingSubName === sub.id}
                                            <input
                                                class="name-input mono"
                                                value={sub.name}
                                                use:focusOnMount
                                                onblur={(e) => {
                                                    grades.updateSubName(
                                                        data.courseId,
                                                        comp.id,
                                                        sub.id,
                                                        (
                                                            e.target as HTMLInputElement
                                                        ).value,
                                                    );
                                                    editingSubName = null;
                                                }}
                                                onkeydown={(e) => {
                                                    if (e.key === "Enter")
                                                        (
                                                            e.target as HTMLInputElement
                                                        ).blur();
                                                }}
                                            />
                                        {:else}
                                            <button
                                                class="name-display mono small"
                                                onclick={() =>
                                                    (editingSubName = sub.id)}
                                            >
                                                {sub.name}<span
                                                    class="edit-hint">✏</span
                                                >
                                            </button>
                                        {/if}
                                    </div>

                                    <div class="sub-score-cell">
                                        {#if sub.scaleTargetId}
                                            <div class="scaled-score-control sub-scaled-control">
                                                <label class="scaled-select-wrap mono">
                                                    <span>scaled</span>
                                                    <select
                                                        class="scaled-select mono"
                                                        value={sub.scaleTargetId}
                                                        aria-label="change sub-item scale target"
                                                        onchange={(e) => handleSubScaleTarget(comp.id, sub.id, (e.target as HTMLSelectElement).value)}
                                                    >
                                                        {#each course.components as target}
                                                            {#if target.id !== comp.id}
                                                                <option value={target.id}>{target.name}</option>
                                                            {/if}
                                                            {#each target.subItems ?? [] as targetSub}
                                                                {#if targetSub.id !== sub.id}
                                                                    <option value={targetSub.id}>↳ {target.name} / {targetSub.name}</option>
                                                                {/if}
                                                            {/each}
                                                        {/each}
                                                    </select>
                                                    <span class="scaled-target-label">
                                                        {#each course.components as target}
                                                            {#if target.id === sub.scaleTargetId}
                                                                {target.name}
                                                            {/if}
                                                            {#each target.subItems ?? [] as targetSub}
                                                                {#if targetSub.id === sub.scaleTargetId}
                                                                    ↳ {target.name} / {targetSub.name}
                                                                {/if}
                                                            {/each}
                                                        {/each}
                                                    </span>
                                                </label>
                                                <button
                                                    class="scaled-clear-btn"
                                                    title="turn off scaling"
                                                    aria-label="turn off scaling"
                                                    onclick={() => handleSubScaleTarget(comp.id, sub.id, "")}
                                                >×</button>
                                            </div>
                                        {:else}
                                            <input
                                                class="num-input mono score-input"
                                                type="number"
                                                min="0"
                                                max={sub.maxScore}
                                                step="0.5"
                                                placeholder="—"
                                                disabled={!!comp.scaleTargetId}
                                                value={sub.score ?? ""}
                                                oninput={(e) =>
                                                    handleSubScore(
                                                        comp.id,
                                                        sub.id,
                                                        (
                                                            e.target as HTMLInputElement
                                                        ).value,
                                                    )}
                                            />
                                            <span class="unit mono">/ </span>
                                            <input
                                                class="num-input mono max-input"
                                                type="number"
                                                min="1"
                                                step="1"
                                                disabled={!!comp.scaleTargetId}
                                                value={sub.maxScore}
                                                oninput={(e) =>
                                                    handleSubMax(
                                                        comp.id,
                                                        sub.id,
                                                        (
                                                            e.target as HTMLInputElement
                                                        ).value,
                                                    )}
                                            />
                                        {/if}
                                    </div>

                                    <div class="sub-pct-cell">
                                        {#if subPct !== null}
                                            <span
                                                class="mono text-xs"
                                                style="color: {subColor}"
                                                >{subPct.toFixed(1)}%</span
                                            >
                                        {:else}
                                            <span class="dimmed mono text-xs"
                                                >—</span
                                            >
                                        {/if}
                                    </div>

                                    <!-- Per-sub curve pill -->
                                    {#if isPerSub}
                                        <div class="sub-curve-cell">
                                            {#if subPred}
                                                <span
                                                    class="curve-pill mono"
                                                    style="color: {subPred.color}; border-color: {subPred.color}40; background: {subPred.color}12"
                                                >
                                                    {subPred.letter}
                                                    <span class="curve-pctl">P{subPred.percentile.toFixed(0)}</span>
                                                </span>
                                            {:else if !sub.scaleTargetId && sub.classAvg != null}
                                                <span class="curve-pill mono dimmed" style="border-color: oklch(1 0 0 / 8%)">—</span>
                                            {/if}
                                        </div>
                                        <button
                                            class="stats-toggle-btn sub-stats-btn"
                                            class:active={isSubStatsOpen || sub.classAvg != null || sub.scaleTargetId}
                                            class:open={isSubStatsOpen}
                                            onclick={() => toggleSubStats(sub.id)}
                                            title="sub-item stats"
                                            aria-label="toggle sub-item statistics"
                                            aria-expanded={isSubStatsOpen}
                                        >
                                            <svg class="dropdown-icon" viewBox="0 0 16 16" aria-hidden="true">
                                                <path d="M4 6l4 4 4-4" />
                                            </svg>
                                        </button>
                                    {/if}

                                    <button
                                        class="remove-btn small"
                                        onclick={() =>
                                            grades.removeSubItem(
                                                data.courseId,
                                                comp.id,
                                                sub.id,
                                            )}
                                        title="remove">×</button
                                    >
                                </div>

                                <!-- Per-sub stats panel -->
                                {#if isPerSub && isSubStatsOpen}
                                    <div class="sub-stats-panel">
                                        <div class="sub-stats-toolbar">
                                            <label class="scale-control mono sub-scale-control">
                                                <span>scale</span>
                                                <select
                                                    class="scale-select mono"
                                                    value={sub.scaleTargetId ?? ""}
                                                    onchange={(e) => handleSubScaleTarget(comp.id, sub.id, (e.target as HTMLSelectElement).value)}
                                                >
                                                    <option value="">off</option>
                                                    {#each course.components as target}
                                                        {#if target.id !== comp.id}
                                                            <option value={target.id}>{target.name}</option>
                                                        {/if}
                                                        {#each target.subItems ?? [] as targetSub}
                                                            {#if targetSub.id !== sub.id}
                                                                <option value={targetSub.id}>↳ {target.name} / {targetSub.name}</option>
                                                            {/if}
                                                        {/each}
                                                    {/each}
                                                </select>
                                            </label>
                                        </div>
                                        {#if !sub.scaleTargetId}
                                        <div class="stats-inputs">
                                            <div class="stats-field">
                                                <label class="stats-label mono">avg</label>
                                                <input
                                                    class="num-input mono stats-input"
                                                    type="number" min="0" max={sub.maxScore} step="0.5"
                                                    placeholder="class avg"
                                                    value={sub.classAvg ?? ""}
                                                    oninput={(e) => handleSubClassStat(comp.id, sub.id, 'classAvg', (e.target as HTMLInputElement).value)}
                                                />
                                            </div>
                                            <div class="stats-field">
                                                <label class="stats-label mono">median</label>
                                                <input
                                                    class="num-input mono stats-input"
                                                    type="number" min="0" max={sub.maxScore} step="0.5"
                                                    placeholder="optional"
                                                    value={sub.classMedian ?? ""}
                                                    oninput={(e) => handleSubClassStat(comp.id, sub.id, 'classMedian', (e.target as HTMLInputElement).value)}
                                                />
                                            </div>
                                            <div class="stats-field">
                                                <label class="stats-label mono">max</label>
                                                <input
                                                    class="num-input mono stats-input"
                                                    type="number" min="0" max={sub.maxScore} step="0.5"
                                                    placeholder="optional"
                                                    value={sub.classMax ?? ""}
                                                    oninput={(e) => handleSubClassStat(comp.id, sub.id, 'classMax', (e.target as HTMLInputElement).value)}
                                                />
                                            </div>
                                            <div class="stats-field">
                                                <label class="stats-label mono">σ</label>
                                                <input
                                                    class="num-input mono stats-input"
                                                    type="number" min="0" step="0.5"
                                                    placeholder="auto"
                                                    value={sub.classStdDev ?? ""}
                                                    oninput={(e) => handleSubClassStat(comp.id, sub.id, 'classStdDev', (e.target as HTMLInputElement).value)}
                                                />
                                            </div>
                                        </div>
                                        {:else}
                                            <div class="stats-hint mono">marks and class statistics are scaled from the selected item</div>
                                        {/if}
                                    </div>
                                {/if}
                            {/each}

                            <button
                                class="add-sub-btn mono"
                                onclick={() =>
                                    grades.addSubItem(data.courseId, comp.id)}
                            >
                                + add {comp.name.toLowerCase()}
                            </button>
                        </div>
                    {/if}

                    <!-- Class stats panel -->
                    {#if isStatsOpen}
                        <div class="stats-panel">
                            <div class="stats-header mono">
                                <span class="dimmed">class statistics</span>
                                <div class="stats-header-right">
                                    {#if hasSubItems}
                                        <div class="mode-toggle mono">
                                            <button
                                                class="mode-btn"
                                                class:active={comp.statsMode !== 'per-sub'}
                                                onclick={() => grades.updateStatsMode(data.courseId, comp.id, 'global')}
                                            >global</button>
                                            <button
                                                class="mode-btn"
                                                class:active={comp.statsMode === 'per-sub'}
                                                onclick={() => grades.updateStatsMode(data.courseId, comp.id, 'per-sub')}
                                            >per-sub</button>
                                        </div>
                                    {/if}
                                    {#if compPred && comp.statsMode !== 'per-sub'}
                                        <span class="stats-prediction" style="color: {compPred.color}">
                                            predicted: {compPred.letter} (P{compPred.percentile.toFixed(1)})
                                        </span>
                                    {/if}
                                    {#if comp.statsMode !== 'per-sub'}
                                    <label class="scale-control mono">
                                        <span>scale</span>
                                        <select
                                            class="scale-select mono"
                                            value={comp.scaleTargetId ?? ""}
                                            onchange={(e) => handleScaleTarget(comp.id, (e.target as HTMLSelectElement).value)}
                                        >
                                            <option value="">off</option>
                                            {#each course.components as target}
                                                {#if target.id !== comp.id}
                                                    <option value={target.id}>{target.name}</option>
                                                    {#each target.subItems ?? [] as sub}
                                                        <option value={sub.id}>↳ {target.name} / {sub.name}</option>
                                                    {/each}
                                                {/if}
                                            {/each}
                                        </select>
                                    </label>
                                    {/if}
                                </div>
                            </div>
                            {#if comp.statsMode !== 'per-sub'}
                                {#if !comp.scaleTargetId}
                                    <div class="stats-inputs">
                                        <div class="stats-field">
                                            <label class="stats-label mono">avg</label>
                                            <input
                                                class="num-input mono stats-input"
                                                type="number"
                                                min="0"
                                                max={comp.maxScore}
                                                step="0.5"
                                                placeholder="class avg"
                                                value={comp.classAvg ?? ""}
                                                oninput={(e) => handleClassStat(comp.id, 'classAvg', (e.target as HTMLInputElement).value)}
                                            />
                                        </div>
                                        <div class="stats-field">
                                            <label class="stats-label mono">median</label>
                                            <input
                                                class="num-input mono stats-input"
                                                type="number"
                                                min="0"
                                                max={comp.maxScore}
                                                step="0.5"
                                                placeholder="optional"
                                                value={comp.classMedian ?? ""}
                                                oninput={(e) => handleClassStat(comp.id, 'classMedian', (e.target as HTMLInputElement).value)}
                                            />
                                        </div>
                                        <div class="stats-field">
                                            <label class="stats-label mono">max</label>
                                            <input
                                                class="num-input mono stats-input"
                                                type="number"
                                                min="0"
                                                max={comp.maxScore}
                                                step="0.5"
                                                placeholder="optional"
                                                value={comp.classMax ?? ""}
                                                oninput={(e) => handleClassStat(comp.id, 'classMax', (e.target as HTMLInputElement).value)}
                                            />
                                        </div>
                                        <div class="stats-field">
                                            <label class="stats-label mono">σ</label>
                                            <input
                                                class="num-input mono stats-input"
                                                type="number"
                                                min="0"
                                                step="0.5"
                                                placeholder="auto"
                                                value={comp.classStdDev ?? ""}
                                                oninput={(e) => handleClassStat(comp.id, 'classStdDev', (e.target as HTMLInputElement).value)}
                                            />
                                        </div>
                                    </div>
                                {/if}
                                <div class="stats-hint mono">
                                    {#if comp.scaleTargetId}
                                        marks are scaled from the selected component while scaling is active
                                    {:else}
                                        enter the class average to predict your grade on the curve
                                    {/if}
                                    {#if !comp.classStdDev && comp.classAvg != null}
                                        · σ auto-estimated
                                    {/if}
                                </div>
                            {:else}
                                <div class="stats-hint mono">
                                    use the dropdown button on each sub-item to enter individual stats
                                </div>
                            {/if}
                        </div>
                    {/if}
                </div>
            {/each}
        </div>

        <div class="totals mono">
            <span
                >total weight: <strong
                    style="color: {totalWeight === 100 ? '#4ade80' : '#fb923c'}"
                    >{totalWeight}%</strong
                ></span
            >
            {#if proj.grade !== null}
                <span
                    >projected total: <strong
                        style="color: {getGradeColor(proj.grade)}"
                        >{((proj.grade * totalWeight) / 100).toFixed(
                            2,
                        )}%</strong
                    ></span
                >
            {/if}
        </div>

        <button
            class="add-full-btn mono"
            onclick={() => grades.addComponent(data.courseId)}
            >+ add component</button
        >
    </main>
</div>
{:else}
<div class="page">
    <main class="main">
        <div class="section-label mono">course not found</div>
        <button class="back-btn mono" onclick={() => goto("/")}>← back</button>
    </main>
</div>
{/if}

<style>
    .page {
        min-height: 100vh;
        display: flex;
        flex-direction: column;
    }

    .header {
        border-bottom: 1px solid oklch(1 0 0 / 7%);
        padding: 0.875rem 2rem;
        position: sticky;
        top: 0;
        background: oklch(0.08 0.02 265 / 90%);
        backdrop-filter: blur(12px);
        z-index: 50;
    }

    .header-inner {
        max-width: 1100px;
        margin: 0 auto;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    .nav-left {
        display: flex;
        align-items: center;
        gap: 1rem;
    }

    .back-btn {
        font-size: 0.75rem;
        color: oklch(0.5 0.02 265);
        background: none;
        border: 1px solid oklch(1 0 0 / 10%);
        border-radius: 5px;
        padding: 0.3rem 0.7rem;
        cursor: pointer;
        transition:
            color 0.15s,
            border-color 0.15s;
    }
    .back-btn:hover {
        color: oklch(0.85 0.01 265);
        border-color: oklch(1 0 0 / 20%);
    }
    .breadcrumb {
        font-size: 0.75rem;
        display: flex;
        gap: 0.4rem;
    }
    .header-actions {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .action-btn {
        background: oklch(1 0 0 / 5%);
        border: 1px solid oklch(1 0 0 / 10%);
        border-radius: 5px;
        padding: 0.3rem 0.7rem;
        color: oklch(0.7 0.02 265);
        cursor: pointer;
        transition: all 0.15s;
    }
    .action-btn:hover {
        background: oklch(1 0 0 / 10%);
        color: oklch(0.9 0.01 265);
    }
    .action-btn.danger:hover {
        color: #f87171;
        border-color: #f8717140;
    }
    .action-btn.add {
        color: #4ade80;
        border-color: #4ade8030;
    }
    .action-btn.add:hover {
        background: #4ade8015;
    }

    .main {
        max-width: 1100px;
        width: 100%;
        margin: 0 auto;
        padding: 2rem;
        flex: 1;
    }

    /* Hero */
    .hero {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 2rem;
        padding: 1.5rem;
        background: oklch(0.12 0.025 265);
        border: 1px solid oklch(1 0 0 / 8%);
        border-radius: 10px;
        position: relative;
        overflow: hidden;
    }
    .hero::before {
        content: "";
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 1px;
        background: linear-gradient(
            90deg,
            transparent,
            var(--accent) 50%,
            transparent
        );
        opacity: 0.5;
    }
    .course-chip {
        font-size: 0.65rem;
        font-weight: 700;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        border: 1px solid;
        border-radius: 4px;
        padding: 0.12rem 0.45rem;
        display: inline-block;
        margin-bottom: 0.5rem;
    }
    .course-fullname {
        font-size: 1.4rem;
        font-weight: 600;
        letter-spacing: -0.02em;
        margin: 0 0 0.4rem;
    }
    .meta {
        font-size: 0.7rem;
        color: oklch(0.5 0.02 265);
    }
    .hero-grade {
        text-align: right;
    }
    .hero-grade-row {
        display: flex;
        align-items: flex-start;
        gap: 1.5rem;
    }
    .hero-grade-col {
        text-align: right;
    }
    .hero-grade-divider {
        width: 1px;
        align-self: stretch;
        background: oklch(1 0 0 / 12%);
    }
    .curved-letter {
        font-size: 2.8rem;
    }
    .letter-grade {
        font-size: 3.5rem;
        font-weight: 800;
        line-height: 1;
        letter-spacing: -0.04em;
    }
    .pct-grade {
        font-size: 1.1rem;
        font-weight: 600;
        margin-top: 0.2rem;
    }
    .grade-note {
        font-size: 0.65rem;
        color: oklch(0.45 0.02 265);
        margin-top: 0.25rem;
    }

    .section-label {
        font-size: 0.65rem;
        font-family: "JetBrains Mono", monospace;
        color: oklch(0.38 0.02 265);
        letter-spacing: 0.05em;
        margin-bottom: 0.75rem;
    }

    /* Component list */
    .comp-list {
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
    }
    .comp-card {
        background: oklch(0.12 0.025 265);
        border: 1px solid oklch(1 0 0 / 8%);
        border-radius: 8px;
        overflow: hidden;
        transition: border-color 0.15s;
    }
    .comp-card.expanded {
        border-color: oklch(1 0 0 / 14%);
    }

    .comp-row {
        display: grid;
        grid-template-columns: 28px 1fr 100px 180px 140px 70px auto 28px 32px;
        align-items: center;
        gap: 0.5rem;
        padding: 0.65rem 0.75rem;
        min-height: 52px;
    }

    /* Expand button */
    .expand-btn {
        background: none;
        border: none;
        padding: 0;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    .expand-btn.has-sub {
        cursor: pointer;
    }
    .chevron {
        font-size: 1.1rem;
        color: oklch(0.45 0.02 265);
        display: inline-block;
        transition:
            transform 0.2s,
            color 0.15s;
        line-height: 1;
    }
    .chevron.open {
        transform: rotate(90deg);
        color: oklch(0.7 0.02 265);
    }
    .plus-expand {
        font-size: 0.95rem;
        color: oklch(0.3 0.02 265);
        display: inline-block;
        transition: color 0.15s;
        line-height: 1;
    }
    .expand-btn:hover .plus-expand {
        color: #4ade80;
    }

    /* Name */
    .comp-name-cell {
        overflow: hidden;
    }
    .name-display {
        background: none;
        border: none;
        color: oklch(0.85 0.01 265);
        font-size: 0.8rem;
        font-family: "JetBrains Mono", monospace;
        cursor: pointer;
        padding: 0.15rem 0.35rem;
        border-radius: 4px;
        display: flex;
        align-items: center;
        gap: 0.4rem;
        transition: background 0.1s;
        max-width: 100%;
    }
    .name-display.small {
        font-size: 0.72rem;
        color: oklch(0.75 0.01 265);
    }
    .name-display:hover {
        background: oklch(1 0 0 / 6%);
    }
    .sub-count {
        font-size: 0.6rem;
        color: oklch(0.45 0.02 265);
        padding: 0.1rem 0.35rem;
        background: oklch(1 0 0 / 6%);
        border-radius: 10px;
    }
    .edit-hint {
        opacity: 0;
        font-size: 0.6rem;
        transition: opacity 0.15s;
    }
    .name-display:hover .edit-hint {
        opacity: 0.5;
    }
    .name-input {
        background: oklch(1 0 0 / 8%);
        border: 1px solid oklch(1 0 0 / 15%);
        border-radius: 4px;
        color: oklch(0.92 0.01 265);
        font-size: 0.8rem;
        padding: 0.15rem 0.4rem;
        width: 95%;
        outline: none;
    }
    .name-input:focus {
        border-color: #22d3ee60;
    }

    /* Cells */
    .comp-cell {
        display: flex;
        align-items: center;
        gap: 0.25rem;
    }
    .weight-cell {
        justify-content: flex-end;
    }
    .score-cell {
        justify-content: flex-end;
    }
    .pct-cell {
        justify-content: flex-end;
    }
    .contrib-cell {
        justify-content: flex-end;
    }

    .num-input {
        background: oklch(1 0 0 / 5%);
        border: 1px solid oklch(1 0 0 / 10%);
        border-radius: 4px;
        color: oklch(0.85 0.01 265);
        font-size: 0.75rem;
        padding: 0.2rem 0.35rem;
        width: 56px;
        text-align: right;
        outline: none;
        transition: border-color 0.15s;
    }
    .num-input:focus {
        border-color: #22d3ee50;
    }
    .num-input:disabled {
        cursor: not-allowed;
        opacity: 0.45;
        border-color: oklch(1 0 0 / 7%);
        color: oklch(0.5 0.02 265);
    }
    .num-input::-webkit-outer-spin-button,
    .num-input::-webkit-inner-spin-button {
        -webkit-appearance: none;
    }
    .num-input[type="number"] {
        -moz-appearance: textfield;
        appearance: textfield;
    }
    .score-input {
        border-color: #22d3ee25;
        color: #22d3ee;
    }
    .score-input:focus {
        border-color: #22d3ee80;
    }
    .max-input {
        width: 46px;
    }
    .unit {
        font-size: 0.7rem;
        color: oklch(0.4 0.02 265);
    }
    .sub-summary {
        font-size: 0.7rem;
        color: oklch(0.5 0.02 265);
        background: none;
        border: 1px solid oklch(1 0 0 / 8%);
        border-radius: 4px;
        padding: 0.2rem 0.5rem;
        cursor: pointer;
        transition: all 0.15s;
    }
    .sub-summary:hover {
        border-color: oklch(1 0 0 / 18%);
        color: oklch(0.7 0.02 265);
    }
    .scaled-score-control {
        display: inline-flex;
        align-items: center;
        justify-content: flex-end;
        gap: 0.25rem;
        width: 100%;
    }
    .sub-scaled-control {
        justify-content: flex-end;
    }
    .scaled-select-wrap {
        position: relative;
        display: inline-flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.1rem;
        min-width: 150px;
        max-width: 220px;
        min-height: 44px;
        padding: 0.35rem 0.75rem;
        background: oklch(1 0 0 / 4%);
        border: 1px solid oklch(1 0 0 / 42%);
        border-radius: 12px;
        color: oklch(0.62 0.02 265);
        cursor: pointer;
        transition:
            border-color 0.15s,
            background 0.15s,
            color 0.15s;
    }
    .scaled-select-wrap:hover {
        background: oklch(1 0 0 / 7%);
        border-color: oklch(1 0 0 / 65%);
        color: oklch(0.82 0.01 265);
    }
    .scaled-select-wrap span {
        font-size: 0.72rem;
        font-weight: 600;
        letter-spacing: 0.02em;
        color: oklch(0.82 0.01 265);
        line-height: 1;
    }
    .scaled-select-wrap .scaled-target-label {
        max-width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: 0.78rem;
        color: oklch(0.88 0.01 265);
    }
    .scaled-select {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        opacity: 0;
        border: none;
        outline: none;
        cursor: pointer;
    }
    .scaled-clear-btn {
        width: 22px;
        height: 22px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: none;
        border: none;
        border-radius: 4px;
        color: oklch(0.36 0.02 265);
        cursor: pointer;
        font-size: 0.9rem;
        line-height: 1;
        transition:
            background 0.15s,
            color 0.15s;
    }
    .scaled-clear-btn:hover {
        background: #f8717115;
        color: #f87171;
    }
    .bar-stack {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 0.2rem;
        width: 100%;
    }
    .bar-track {
        width: 100%;
        height: 3px;
        background: oklch(1 0 0 / 6%);
        border-radius: 2px;
        overflow: hidden;
    }
    .bar-fill {
        height: 100%;
        border-radius: 2px;
        transition: width 0.35s ease;
    }
    .dimmed {
        color: oklch(0.35 0.02 265);
    }

    .remove-btn {
        background: none;
        border: none;
        color: oklch(0.35 0.02 265);
        font-size: 1rem;
        cursor: pointer;
        padding: 0.1rem 0.35rem;
        border-radius: 4px;
        line-height: 1;
        transition:
            color 0.15s,
            background 0.15s;
    }
    .remove-btn:hover {
        color: #f87171;
        background: #f8717115;
    }
    .remove-btn.small {
        font-size: 0.85rem;
    }

    /* Curve pill */
    .curve-cell {
        justify-content: flex-end;
        min-width: 56px;
    }
    .curve-pill {
        font-size: 0.62rem;
        font-weight: 600;
        letter-spacing: 0.04em;
        border: 1px solid;
        border-radius: 10px;
        padding: 0.1rem 0.45rem;
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
        white-space: nowrap;
        transition: all 0.2s ease;
    }
    .curve-pctl {
        font-size: 0.55rem;
        opacity: 0.7;
    }

    /* Stats toggle button */
    .stats-toggle-btn {
        width: 24px;
        height: 24px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: oklch(1 0 0 / 3%);
        border: 1px solid oklch(1 0 0 / 8%);
        color: oklch(0.45 0.02 265);
        cursor: pointer;
        padding: 0;
        border-radius: 6px;
        line-height: 1;
        opacity: 0.75;
        transition:
            background 0.15s,
            border-color 0.15s,
            color 0.15s,
            opacity 0.15s;
    }
    .stats-toggle-btn:hover {
        background: oklch(1 0 0 / 6%);
        border-color: oklch(1 0 0 / 16%);
        color: oklch(0.72 0.02 265);
        opacity: 1;
    }
    .stats-toggle-btn.active {
        background: #22d3ee12;
        border-color: #22d3ee35;
        color: #22d3ee;
        opacity: 1;
    }
    .dropdown-icon {
        width: 14px;
        height: 14px;
        fill: none;
        stroke: currentColor;
        stroke-width: 1.8;
        stroke-linecap: round;
        stroke-linejoin: round;
        transition: transform 0.18s ease;
    }
    .stats-toggle-btn.open .dropdown-icon {
        transform: rotate(180deg);
    }

    /* Class stats panel */
    .stats-panel {
        border-top: 1px solid oklch(1 0 0 / 7%);
        padding: 0.6rem 18rem 0.75rem 2.25rem;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        position: relative;
        background: oklch(0.09 0.025 265);
    }
    .stats-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 0.68rem;
        gap: 0.5rem;
    }
    .stats-prediction {
        font-weight: 600;
        font-size: 0.7rem;
    }
    .stats-inputs {
        display: flex;
        gap: 0.75rem;
        flex-wrap: wrap;
    }
    .stats-field {
        display: flex;
        align-items: center;
        gap: 0.3rem;
    }
    .stats-label {
        font-size: 0.62rem;
        color: oklch(0.5 0.02 265);
        letter-spacing: 0.05em;
        text-transform: uppercase;
        min-width: 2.5rem;
    }
    .stats-input {
        width: 68px;
        border-color: oklch(1 0 0 / 12%);
    }
    .stats-input:focus {
        border-color: #a78bfa50;
        box-shadow: 0 0 0 1px #a78bfa20;
    }
    .stats-hint {
        font-size: 0.58rem;
        color: oklch(0.38 0.02 265);
        line-height: 1.4;
    }

    /* Mode toggle (global / per-sub) */
    .stats-header-right {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        flex-wrap: wrap;
        justify-content: flex-end;
    }
    .mode-toggle {
        display: flex;
        border: 1px solid oklch(1 0 0 / 12%);
        border-radius: 5px;
        overflow: hidden;
    }
    .mode-btn {
        font-size: 0.58rem;
        padding: 0.15rem 0.5rem;
        background: none;
        border: none;
        color: oklch(0.45 0.02 265);
        cursor: pointer;
        transition: all 0.15s;
    }
    .mode-btn:not(:last-child) {
        border-right: 1px solid oklch(1 0 0 / 12%);
    }
    .mode-btn.active {
        background: oklch(1 0 0 / 8%);
        color: oklch(0.85 0.01 265);
    }
    .mode-btn:hover:not(.active) {
        background: oklch(1 0 0 / 4%);
    }
    .scale-control {
        position: absolute;
        top: 50%;
        right: 1.1rem;
        transform: translateY(-50%);
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        color: oklch(0.45 0.02 265);
        font-size: 0.58rem;
        letter-spacing: 0.04em;
        text-transform: uppercase;
    }
    .scale-select {
        max-width: 220px;
        background: oklch(1 0 0 / 4%);
        border: 1px solid oklch(1 0 0 / 12%);
        border-radius: 6px;
        padding: 0.28rem 1.5rem 0.28rem 0.5rem;
        color: oklch(0.82 0.01 265);
        font-size: 0.65rem;
        outline: none;
        cursor: pointer;
        appearance: none;
    }
    .scale-select:focus {
        border-color: #22d3ee45;
        box-shadow: 0 0 0 1px #22d3ee20;
    }

    /* Per-sub-item stats panel */
    .sub-stats-panel {
        position: relative;
        padding: 0.35rem 18rem 0.35rem 1.5rem;
        background: oklch(0.085 0.02 265);
        border-top: 1px solid oklch(1 0 0 / 5%);
        border-bottom: 1px solid oklch(1 0 0 / 5%);
    }
    .sub-stats-panel .stats-inputs {
        gap: 0.5rem;
    }
    .sub-stats-toolbar {
        display: flex;
        justify-content: flex-end;
    }
    .sub-scale-control {
        position: absolute;
        top: 50%;
        right: 0.75rem;
        transform: translateY(-50%);
    }
    .sub-curve-cell {
        display: flex;
        align-items: center;
        justify-content: flex-end;
    }
    .sub-stats-btn {
        font-size: 0.65rem;
    }

    /* Sub-items panel */
    .sub-panel {
        border-top: 1px solid oklch(1 0 0 / 7%);
        padding: 0.5rem 0.75rem 0.75rem 2.25rem;
        display: flex;
        flex-direction: column;
        gap: 0.3rem;
        background: oklch(0.1 0.02 265);
    }
    .best-of-row {
        display: flex;
        align-items: center;
        gap: 0.4rem;
        font-size: 0.7rem;
        color: oklch(0.65 0.02 265);
        padding: 0.4rem 0;
        border-bottom: 1px solid oklch(1 0 0 / 6%);
        margin-bottom: 0.25rem;
    }
    .bestof-input {
        width: 40px;
        padding: 0.1rem 0.25rem;
        font-size: 0.7rem;
        background: oklch(1 0 0 / 8%);
        border: 1px solid oklch(1 0 0 / 15%);
        border-radius: 4px;
        color: #fbbf24;
        text-align: center;
        outline: none;
    }
    .bestof-input::-webkit-outer-spin-button,
    .bestof-input::-webkit-inner-spin-button {
        -webkit-appearance: none;
    }
    .bestof-input[type="number"] {
        -moz-appearance: textfield;
        appearance: textfield;
    }
    .pill-btn {
        background: oklch(1 0 0 / 6%);
        border: 1px solid oklch(1 0 0 / 12%);
        border-radius: 10px;
        color: oklch(0.6 0.02 265);
        font-size: 0.65rem;
        padding: 0.1rem 0.5rem;
        cursor: pointer;
        transition: all 0.15s;
    }
    .pill-btn:hover {
        background: oklch(1 0 0 / 12%);
        color: oklch(0.85 0.01 265);
    }
    .pill-btn:disabled {
        cursor: not-allowed;
        opacity: 0.45;
    }
    .sub-row {
        display: grid;
        grid-template-columns: 1fr 200px 70px 28px;
        align-items: center;
        gap: 0.5rem;
        padding: 0.3rem 0.25rem;
        border-radius: 5px;
        transition: background 0.1s;
    }
    .sub-row:hover {
        background: oklch(1 0 0 / 3%);
    }
    .sub-row.per-sub {
        grid-template-columns: 1fr 280px 70px 56px 28px 28px;
    }
    .sub-row.per-sub > .remove-btn {
        justify-self: center;
    }
    .sub-name-cell {
        overflow: hidden;
    }
    .sub-score-cell {
        display: flex;
        align-items: center;
        gap: 0.25rem;
        justify-content: flex-end;
    }
    .sub-pct-cell {
        text-align: right;
    }
    .add-sub-btn {
        margin-top: 0.35rem;
        padding: 0.4rem;
        background: none;
        border: 1px dashed oklch(1 0 0 / 10%);
        border-radius: 6px;
        color: oklch(0.45 0.02 265);
        font-size: 0.7rem;
        cursor: pointer;
        text-align: left;
        transition: all 0.15s;
    }
    .add-sub-btn:hover {
        border-color: #4ade8030;
        color: #4ade80;
        background: #4ade8008;
    }

    /* Totals */
    .totals {
        margin-top: 1rem;
        padding: 0.75rem 1rem;
        background: oklch(0.1 0.02 265);
        border: 1px solid oklch(1 0 0 / 6%);
        border-radius: 6px;
        font-size: 0.72rem;
        color: oklch(0.5 0.02 265);
        display: flex;
        gap: 2rem;
    }
    .add-full-btn {
        width: 100%;
        margin-top: 0.75rem;
        padding: 0.65rem;
        background: oklch(1 0 0 / 3%);
        border: 1px dashed oklch(1 0 0 / 12%);
        border-radius: 8px;
        color: oklch(0.5 0.02 265);
        font-size: 0.75rem;
        cursor: pointer;
        transition: all 0.15s;
    }
    .add-full-btn:hover {
        background: #4ade8010;
        border-color: #4ade8030;
        color: #4ade80;
    }

    /* ── Mobile ≤ 768px ──────────────────────── */
    @media (max-width: 768px) {
        .header {
            padding: 0.75rem 1rem;
        }
        .header-inner {
            flex-wrap: wrap;
            gap: 0.5rem;
        }
        .nav-left {
            flex: 1;
            min-width: 0;
            gap: 0.5rem;
        }
        .breadcrumb {
            min-width: 0;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        .header-actions {
            width: 100%;
            flex-wrap: wrap;
            gap: 0.35rem;
        }
        .action-btn {
            padding: 0.25rem 0.5rem;
        }
        .main {
            padding: 1.25rem 0.75rem;
        }

        /* Hero — stack vertically */
        .hero {
            flex-direction: column;
            gap: 1rem;
            padding: 1.25rem;
            margin-bottom: 1.5rem;
        }
        .hero-grade {
            text-align: left;
        }
        .hero-grade-row {
            gap: 1rem;
        }
        .letter-grade {
            font-size: 2.5rem;
        }
        .curved-letter {
            font-size: 2rem;
        }
        .pct-grade {
            font-size: 1rem;
        }
        .grade-note {
            display: none;
        }
        .course-fullname {
            font-size: 1.15rem;
        }

        /* ── Folded component card ────────────── */
        .comp-row {
            /*
             * Fold into 4 rows:
             *   Row 1:  expand  name .............. weight  stats  remove
             *   Row 2:          score-area           pct-area
             *   Row 3:          contrib-area          curve-area
             */
            display: grid;
            grid-template-columns: 28px 1fr auto auto 28px 28px;
            grid-template-rows: auto auto auto;
            gap: 0.3rem 0.4rem;
            padding: 0.6rem 0.65rem;
            min-height: unset;
        }

        /* Row 1 */
        .expand-btn   { grid-column: 1; grid-row: 1; }
        .comp-name-cell { grid-column: 2; grid-row: 1; }
        .weight-cell  { grid-column: 3 / 5; grid-row: 1; }
        .stats-toggle-btn { grid-column: 5; grid-row: 1; align-self: center; }
        .remove-btn   { grid-column: 6; grid-row: 1; align-self: center; }

        /* Row 2 */
        .score-cell   { grid-column: 2 / 4; grid-row: 2; justify-content: flex-start; }
        .pct-cell     { grid-column: 4 / 7; grid-row: 2; justify-content: flex-end; }

        /* Row 3 */
        .contrib-cell { grid-column: 2 / 4; grid-row: 3; justify-content: flex-start; font-size: 0.65rem; }
        .curve-cell   { grid-column: 4 / 7; grid-row: 3; justify-content: flex-end; }

        .bar-stack {
            min-width: 50px;
        }
        .num-input {
            width: 50px;
        }
        .max-input {
            width: 42px;
        }

        /* ── Folded sub-rows ──────────────────── */
        .sub-panel {
            padding-left: 1rem;
            padding-right: 0.5rem;
        }
        .stats-panel {
            padding-left: 1rem;
            padding-right: 0.5rem;
        }
        .sub-stats-panel {
            padding-left: 1rem;
            padding-right: 0.5rem;
        }
        .scale-control {
            position: static;
            transform: none;
        }
        .stats-inputs {
            flex-direction: column;
            gap: 0.4rem;
        }
        .best-of-row {
            flex-wrap: wrap;
        }

        .sub-row {
            display: grid;
            grid-template-columns: 1fr auto 28px;
            grid-template-rows: auto auto;
            gap: 0.2rem 0.4rem;
            padding: 0.35rem 0.25rem;
        }
        .sub-row.per-sub {
            grid-template-columns: 1fr auto 28px 28px;
            grid-template-rows: auto auto auto;
        }

        .sub-name-cell  { grid-column: 1; grid-row: 1; }
        .sub-pct-cell   { grid-column: 2; grid-row: 1; align-self: center; }
        .sub-row > .remove-btn { grid-column: 3; grid-row: 1; align-self: center; }
        .sub-score-cell { grid-column: 1 / 4; grid-row: 2; justify-content: flex-start; }
        .sub-row.per-sub .sub-stats-btn { grid-column: 3; grid-row: 1; align-self: center; }
        .sub-row.per-sub > .remove-btn { grid-column: 4; grid-row: 1; align-self: center; }
        .sub-row.per-sub .sub-score-cell { grid-column: 1 / 5; }
        .sub-row.per-sub .sub-curve-cell { grid-column: 1 / 5; grid-row: 3; justify-content: flex-start; }

        /* Totals */
        .totals {
            flex-wrap: wrap;
            gap: 0.5rem 1.5rem;
        }
    }

    /* ── Extra-small ≤ 480px ─────────────────── */
    @media (max-width: 480px) {
        .header {
            padding: 0.6rem 0.65rem;
        }
        .main {
            padding: 1rem 0.5rem;
        }
        .hero {
            padding: 1rem;
        }
        .course-fullname {
            font-size: 1rem;
        }
        .letter-grade {
            font-size: 2rem;
        }
        .num-input {
            width: 46px;
            font-size: 0.7rem;
        }
        .max-input {
            width: 38px;
        }
    }
</style>
