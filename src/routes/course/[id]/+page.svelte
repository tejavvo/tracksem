<script lang="ts">
    import type { PageProps } from "./$types";
    import {
        grades,
        computeEffectiveCompPct,
        computeEffectiveSubPct,
        computeCourseTotals,
        computeClassTotalDistribution,
        computeClassGap,
    } from "$lib/stores/grades.svelte";
    import { getGradeColor, getLetterGrade } from "$lib/grading";
    import { predictGrade } from "$lib/curveGrading";
    import { goto } from "$app/navigation";
    import type { Component as GradeComponent } from "$lib/types";
    import ClassDistributionChart from "$lib/components/ClassDistributionChart.svelte";
    import ComponentSheet from "$lib/components/ComponentSheet.svelte";
    import ScoreInput from "$lib/components/ScoreInput.svelte";
    import * as Card from "$lib/components/ui/card";
    import * as Table from "$lib/components/ui/table";
    import * as Breadcrumb from "$lib/components/ui/breadcrumb";
    import * as ButtonGroup from "$lib/components/ui/button-group";
    import * as InputGroup from "$lib/components/ui/input-group";
    import * as AlertDialog from "$lib/components/ui/alert-dialog";
    import * as Alert from "$lib/components/ui/alert";
    import * as Empty from "$lib/components/ui/empty";
    import { Button } from "$lib/components/ui/button";
    import { Badge } from "$lib/components/ui/badge";
    import { Separator } from "$lib/components/ui/separator";
    import { Spinner } from "$lib/components/ui/spinner";
    import PlusIcon from "@lucide/svelte/icons/plus";
    import TrashIcon from "@lucide/svelte/icons/trash-2";
    import RotateCcwIcon from "@lucide/svelte/icons/rotate-ccw";
    import ChartBarIcon from "@lucide/svelte/icons/chart-bar";
    import TriangleAlertIcon from "@lucide/svelte/icons/triangle-alert";
    import ArrowLeftIcon from "@lucide/svelte/icons/arrow-left";
    import SlidersIcon from "@lucide/svelte/icons/sliders-horizontal";
    import TargetIcon from "@lucide/svelte/icons/target";
    import ChevronDownIcon from "@lucide/svelte/icons/chevron-down";
    import * as Collapsible from "$lib/components/ui/collapsible";

    let { data }: PageProps = $props();

    const course = $derived(grades.getCourse(data.courseId));
    const proj = $derived(grades.projectedGrade(data.courseId));
    const totalWeight = $derived(grades.totalWeight(data.courseId));
    const totals = $derived(course ? computeCourseTotals(course) : null);
    const classDist = $derived(course ? computeClassTotalDistribution(course) : null);
    const classGap = $derived(course ? computeClassGap(course) : null);
    let distOpen = $state(false);
    const gradeColor = $derived(getGradeColor(proj.grade));
    const curved = $derived(grades.curvedGrade(data.courseId));

    /** Course points → percent of the course. */
    function ofCourse(points: number): string {
        const w = totals?.totalWeight || 100;
        return `${((points / w) * 100).toFixed(1)}%`;
    }

    // ─── Side panel ────────────────────────────────────────────────────────────
    let editingId = $state<string | null>(null);
    const editingComp = $derived(course?.components.find((c) => c.id === editingId));

    function addComponent() {
        grades.addComponent(data.courseId);
        const comps = grades.getCourse(data.courseId)?.components;
        editingId = comps?.[comps.length - 1]?.id ?? null;
    }

    // ─── Course actions ───────────────────────────────────────────────────────
    let deletingCourse = $state(false);
    async function handleDeleteCourse() {
        if (deletingCourse) return;
        deletingCourse = true;
        await grades.deleteCourse(data.courseId);
        goto("/");
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────
    function itemName(id: string | null | undefined): string {
        if (!id || !course) return "";
        for (const c of course.components) {
            if (c.id === id) return c.name;
            const s = c.subItems?.find((x) => x.id === id);
            if (s) return `${c.name} › ${s.name}`;
        }
        return "another item";
    }

    function prediction(pct: number | null, item: { classAvg?: number | null; classMedian?: number | null; classMax?: number | null; classStdDev?: number | null; maxScore: number }) {
        if (pct === null || item.classAvg == null) return null;
        return predictGrade((pct / 100) * item.maxScore, item.maxScore, item.classAvg, {
            median: item.classMedian,
            max: item.classMax,
            stdDev: item.classStdDev,
        });
    }

    function setWeight(comp: GradeComponent, e: Event) {
        const n = parseFloat((e.currentTarget as HTMLInputElement).value);
        if (!isNaN(n) && n >= 0 && n <= 100) grades.updateWeight(data.courseId, comp.id, n);
    }
</script>

{#snippet result(pct: number | null, pred: { letter: string; percentile: number } | null)}
    <div class="flex items-center justify-end gap-2">
        {#if pred}
            <Badge variant="outline" class="font-mono">{pred.letter} · P{pred.percentile.toFixed(0)}</Badge>
        {/if}
        <span class="w-14 text-right font-mono tabular-nums" class:text-muted-foreground={pct === null}>
            {pct !== null ? `${pct.toFixed(1)}%` : "—"}
        </span>
    </div>
{/snippet}

{#if course}
<div class="flex min-h-svh flex-col">
    <header class="bg-background/80 sticky top-0 z-10 border-b backdrop-blur">
        <div class="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4">
            <div class="flex items-center gap-3">
                <Button variant="ghost" size="icon" href="/" aria-label="Back">
                    <ArrowLeftIcon />
                </Button>
                <Breadcrumb.Root>
                    <Breadcrumb.List>
                        <Breadcrumb.Item>
                            <Breadcrumb.Link href="/">tracksem</Breadcrumb.Link>
                        </Breadcrumb.Item>
                        <Breadcrumb.Separator />
                        <Breadcrumb.Item>
                            <Breadcrumb.Page class="font-mono">{course.name}</Breadcrumb.Page>
                        </Breadcrumb.Item>
                    </Breadcrumb.List>
                </Breadcrumb.Root>
            </div>

            <ButtonGroup.Root>
                <AlertDialog.Root>
                    <AlertDialog.Trigger>
                        {#snippet child({ props })}
                            <Button {...props} variant="outline" size="sm">
                                <RotateCcwIcon data-icon="inline-start" />
                                Reset
                            </Button>
                        {/snippet}
                    </AlertDialog.Trigger>
                    <AlertDialog.Content>
                        <AlertDialog.Header>
                            <AlertDialog.Title>Reset {course.name} to defaults?</AlertDialog.Title>
                            <AlertDialog.Description>
                                All components, scores and class statistics for this course will be replaced with the defaults.
                            </AlertDialog.Description>
                        </AlertDialog.Header>
                        <AlertDialog.Footer>
                            <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
                            <AlertDialog.Action variant="destructive" onclick={() => grades.resetCourse(data.courseId)}>
                                Reset
                            </AlertDialog.Action>
                        </AlertDialog.Footer>
                    </AlertDialog.Content>
                </AlertDialog.Root>

                <AlertDialog.Root>
                    <AlertDialog.Trigger>
                        {#snippet child({ props })}
                            <Button {...props} variant="outline" size="sm" disabled={deletingCourse}>
                                {#if deletingCourse}
                                    <Spinner data-icon="inline-start" />
                                {:else}
                                    <TrashIcon data-icon="inline-start" />
                                {/if}
                                Delete
                            </Button>
                        {/snippet}
                    </AlertDialog.Trigger>
                    <AlertDialog.Content>
                        <AlertDialog.Header>
                            <AlertDialog.Title>Delete {course.name}?</AlertDialog.Title>
                            <AlertDialog.Description>
                                This permanently removes the course and all of its scores.
                            </AlertDialog.Description>
                        </AlertDialog.Header>
                        <AlertDialog.Footer>
                            <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
                            <AlertDialog.Action variant="destructive" onclick={handleDeleteCourse}>
                                Delete
                            </AlertDialog.Action>
                        </AlertDialog.Footer>
                    </AlertDialog.Content>
                </AlertDialog.Root>
            </ButtonGroup.Root>
        </div>
    </header>

    <main class="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8">
        <Card.Root>
            <Card.Header>
                <Card.Description class="font-mono">{course.name}</Card.Description>
                <Card.Title class="text-2xl">{course.fullName}</Card.Title>
                <Card.Description>{proj.filled}/{proj.total} components graded</Card.Description>
                <Card.Action class="flex items-center gap-6">
                    <div class="flex flex-col items-end gap-1">
                        <span class="font-mono text-4xl font-semibold" style="color: {gradeColor}">
                            {getLetterGrade(proj.grade)}
                        </span>
                        {#if proj.grade !== null}
                            <span class="font-mono text-sm tabular-nums">{proj.grade.toFixed(2)}%</span>
                            <span class="text-muted-foreground text-xs">absolute</span>
                        {:else}
                            <span class="text-muted-foreground text-xs">enter scores to see projection</span>
                        {/if}
                    </div>
                    {#if curved}
                        <Separator orientation="vertical" class="h-16" />
                        <div class="flex flex-col items-end gap-1">
                            <span class="font-mono text-4xl font-semibold" style="color: {curved.color}">
                                {curved.letter}
                            </span>
                            <span class="font-mono text-sm tabular-nums">P{curved.percentile.toFixed(0)}</span>
                            <span class="text-muted-foreground text-xs">curved</span>
                        </div>
                    {/if}
                </Card.Action>
            </Card.Header>
            {#if totalWeight !== 100}
                <Card.Content>
                    <Alert.Root>
                        <TriangleAlertIcon />
                        <Alert.Title>Weights add up to {totalWeight}%</Alert.Title>
                        <Alert.Description>Adjust the weights below so they add up to 100%.</Alert.Description>
                    </Alert.Root>
                </Card.Content>
            {/if}
        </Card.Root>

        {#if totals}
            <div class="grid gap-4 sm:grid-cols-3">
                <Card.Root size="sm">
                    <Card.Header>
                        <Card.Description>Course total gained</Card.Description>
                        <Card.Title class="font-mono text-2xl! font-semibold tabular-nums">{ofCourse(totals.gained)}</Card.Title>
                    </Card.Header>
                    <Card.Footer class="text-muted-foreground text-xs">
                        Of the course, already locked in.
                    </Card.Footer>
                </Card.Root>
                <Card.Root size="sm">
                    <Card.Header>
                        <Card.Description>Course total graded</Card.Description>
                        <Card.Title class="font-mono text-2xl! font-semibold tabular-nums">{ofCourse(totals.graded)}</Card.Title>
                    </Card.Header>
                    <Card.Footer class="text-muted-foreground text-xs">
                        Of the course, already assessed.
                        {#if totals.graded > 0}
                            You kept {((totals.gained / totals.graded) * 100).toFixed(1)}% of it.
                        {/if}
                    </Card.Footer>
                </Card.Root>
                <Card.Root size="sm">
                    <Card.Header>
                        <Card.Description>Maximum possible course total</Card.Description>
                        <Card.Title class="font-mono text-2xl! font-semibold tabular-nums">{ofCourse(totals.maxPossible)}</Card.Title>
                    </Card.Header>
                    <Card.Footer class="text-muted-foreground text-xs">
                        With full marks on the remaining {ofCourse(totals.maxPossible - totals.gained)}.
                    </Card.Footer>
                </Card.Root>
            </div>
        {/if}

        <Card.Root>
            <Card.Header>
                <Card.Title>Scores</Card.Title>
                <Card.Description>
                    Type <span class="font-mono">23</span>, <span class="font-mono">23/30</span> or
                    <span class="font-mono">80%</span>, then press Enter or Tab. Use
                    <SlidersIcon class="inline size-3.5 align-[-2px]" /> for parts, best-of, scaling and more class stats.
                </Card.Description>
                <Card.Action>
                    <Button size="sm" onclick={addComponent}>
                        <PlusIcon data-icon="inline-start" />
                        Add component
                    </Button>
                </Card.Action>
            </Card.Header>
            <Card.Content>
                <Table.Root>
                    <Table.Header>
                        <Table.Row>
                            <Table.Head>Component</Table.Head>
                            <Table.Head class="w-24">Weight</Table.Head>
                            <Table.Head class="w-36">Your score</Table.Head>
                            <Table.Head class="w-36">Class avg</Table.Head>
                            <Table.Head class="text-right">Result</Table.Head>
                            <Table.Head class="w-0"><span class="sr-only">Edit</span></Table.Head>
                        </Table.Row>
                    </Table.Header>
                    <Table.Body>
                        {#each course.components as comp (comp.id)}
                            {@const pct = computeEffectiveCompPct(course, comp)}
                            {@const hasParts = !!comp.subItems && comp.subItems.length > 0}
                            {@const perPart = hasParts && comp.statsMode === "per-sub"}
                            {@const entered = comp.subItems?.filter((s) => s.score !== null).length ?? 0}
                            <Table.Row>
                                <Table.Cell class="font-medium">
                                    <div class="flex flex-col">
                                        <span>{comp.name}</span>
                                        {#if hasParts}
                                            <span class="text-muted-foreground text-xs font-normal">
                                                {entered}/{comp.subItems!.length} entered{#if comp.bestOf} · best {comp.bestOf}{/if}
                                            </span>
                                        {/if}
                                    </div>
                                </Table.Cell>
                                <Table.Cell>
                                    <InputGroup.Root class="w-20">
                                        <InputGroup.Input
                                            aria-label="{comp.name} weight"
                                            inputmode="decimal"
                                            class="font-mono"
                                            value={comp.weight}
                                            onchange={(e) => setWeight(comp, e)}
                                        />
                                        <InputGroup.Addon align="inline-end"><InputGroup.Text>%</InputGroup.Text></InputGroup.Addon>
                                    </InputGroup.Root>
                                </Table.Cell>
                                <Table.Cell>
                                    {#if comp.scaleTargetId}
                                        <span class="text-muted-foreground text-xs">from {itemName(comp.scaleTargetId)}</span>
                                    {:else if !hasParts}
                                        <ScoreInput
                                            aria-label="{comp.name} score"
                                            value={comp.score}
                                            max={comp.maxScore}
                                            allowMaxChange
                                            onCommit={(p) => {
                                                if (p.max !== undefined) grades.updateMaxScore(data.courseId, comp.id, p.max);
                                                grades.updateScore(data.courseId, comp.id, p.score);
                                            }}
                                        />
                                    {/if}
                                </Table.Cell>
                                <Table.Cell>
                                    {#if comp.scaleTargetId}
                                        <span class="text-muted-foreground text-xs">from source</span>
                                    {:else if perPart}
                                        <span class="text-muted-foreground text-xs">per part</span>
                                    {:else}
                                        <ScoreInput
                                            aria-label="{comp.name} class average"
                                            value={comp.classAvg}
                                            max={comp.maxScore}
                                            onCommit={(p) => grades.updateClassStats(data.courseId, comp.id, "classAvg", p.score)}
                                        />
                                    {/if}
                                </Table.Cell>
                                <Table.Cell>
                                    {@render result(pct, comp.scaleTargetId || perPart ? null : prediction(pct, comp))}
                                </Table.Cell>
                                <Table.Cell>
                                    <Button
                                        variant="ghost"
                                        size="icon-sm"
                                        aria-label="Edit {comp.name}"
                                        onclick={() => (editingId = comp.id)}
                                    >
                                        <SlidersIcon />
                                    </Button>
                                </Table.Cell>
                            </Table.Row>

                            {#if hasParts}
                                {#each comp.subItems! as sub (sub.id)}
                                    {@const subPct = computeEffectiveSubPct(course, sub)}
                                    <Table.Row class="border-0">
                                        <Table.Cell class="text-muted-foreground pl-6">{sub.name}</Table.Cell>
                                        <Table.Cell class="text-muted-foreground font-mono text-xs">
                                            {(comp.weight / comp.subItems!.length).toFixed(1)}%
                                        </Table.Cell>
                                        <Table.Cell>
                                            {#if sub.scaleTargetId || comp.scaleTargetId}
                                                <span class="text-muted-foreground text-xs">
                                                    from {itemName(sub.scaleTargetId ?? comp.scaleTargetId)}
                                                </span>
                                            {:else}
                                                <ScoreInput
                                                    aria-label="{sub.name} score"
                                                    value={sub.score}
                                                    max={sub.maxScore}
                                                    allowMaxChange
                                                    onCommit={(p) => {
                                                        if (p.max !== undefined) grades.updateSubMaxScore(data.courseId, comp.id, sub.id, p.max);
                                                        grades.updateSubScore(data.courseId, comp.id, sub.id, p.score);
                                                    }}
                                                />
                                            {/if}
                                        </Table.Cell>
                                        <Table.Cell>
                                            {#if perPart && !sub.scaleTargetId}
                                                <ScoreInput
                                                    aria-label="{sub.name} class average"
                                                    value={sub.classAvg}
                                                    max={sub.maxScore}
                                                    onCommit={(p) => grades.updateSubClassStats(data.courseId, comp.id, sub.id, "classAvg", p.score)}
                                                />
                                            {/if}
                                        </Table.Cell>
                                        <Table.Cell>
                                            {@render result(subPct, perPart && !sub.scaleTargetId ? prediction(subPct, sub) : null)}
                                        </Table.Cell>
                                        <Table.Cell></Table.Cell>
                                    </Table.Row>
                                {/each}
                                <Table.Row class="hover:bg-transparent">
                                    <Table.Cell colspan={6} class="pt-0 pl-4">
                                        <Button variant="ghost" size="xs" onclick={() => grades.addSubItem(data.courseId, comp.id)}>
                                            <PlusIcon data-icon="inline-start" />
                                            Add {comp.name} {comp.subItems!.length + 1}
                                        </Button>
                                    </Table.Cell>
                                </Table.Row>
                            {/if}
                        {/each}
                    </Table.Body>
                    <Table.Footer>
                        <Table.Row>
                            <Table.Cell>Total</Table.Cell>
                            <Table.Cell>
                                <Badge variant={totalWeight === 100 ? "secondary" : "destructive"} class="font-mono">
                                    {totalWeight}%
                                </Badge>
                            </Table.Cell>
                            <Table.Cell colspan={2}></Table.Cell>
                            <Table.Cell class="text-right font-mono tabular-nums">
                                {proj.grade !== null ? `${proj.grade.toFixed(1)}%` : "—"}
                            </Table.Cell>
                            <Table.Cell></Table.Cell>
                        </Table.Row>
                    </Table.Footer>
                </Table.Root>
            </Card.Content>
        </Card.Root>

        <Card.Root>
            <Card.Header>
                <Card.Title>Standing vs class</Card.Title>
                <Card.Description>
                    {#if classGap}
                        Based on {classGap.coveredNames.join(", ")}: the graded work with a class average
                        ({classGap.coveredWeight.toFixed(1)}% of the course).
                    {:else}
                        Shows how far you are from the class average once you enter class averages.
                    {/if}
                </Card.Description>
            </Card.Header>
            <Card.Content class="flex flex-col gap-4">
                {#if classGap}
                    {@const behind = classGap.gap < -0.05}
                    {@const ahead = classGap.gap > 0.05}
                    <div class="flex flex-col gap-1">
                        <span class="font-mono text-4xl font-semibold tabular-nums">
                            {classGap.gap > 0 ? "+" : ""}{classGap.gap.toFixed(1)}%
                        </span>
                        <span class="text-muted-foreground text-sm">
                            {#if behind}of the course behind the class average{:else if ahead}of the course ahead of the class average{:else}level with the class average{/if}
                        </span>
                    </div>
                    {#if classGap.open > 0}
                        <Alert.Root>
                            <TargetIcon />
                            <Alert.Title>
                                {#if behind}
                                    To catch up: score {classGap.catchUp!.toFixed(1)} points above the class average on the remaining {classGap.open.toFixed(1)}%
                                {:else}
                                    Matching the class average on the remaining {classGap.open.toFixed(1)}% keeps you {ahead ? "ahead" : "level"}
                                {/if}
                            </Alert.Title>
                            <Alert.Description>
                                For example, {Math.min(100, 70 + Math.max(0, classGap.catchUp ?? 0)).toFixed(0)}% where the class gets 70%.
                            </Alert.Description>
                        </Alert.Root>
                    {:else}
                        <p class="text-muted-foreground text-sm">The course is fully graded.</p>
                    {/if}
                    {#if classDist}
                        <Collapsible.Root bind:open={distOpen}>
                            <Collapsible.Trigger>
                                {#snippet child({ props })}
                                    <Button {...props} variant="ghost" size="sm" class="-ml-2">
                                        <ChevronDownIcon data-icon="inline-start" class={distOpen ? "" : "-rotate-90"} />
                                        Show distribution
                                    </Button>
                                {/snippet}
                            </Collapsible.Trigger>
                            <Collapsible.Content class="flex flex-col gap-2 pt-2">
                                <p class="text-muted-foreground text-xs">
                                    Estimated class spread on the graded part only ({classDist.coveredWeight}% of the course).
                                    Early in a course this is narrow, so percentiles look extreme.
                                </p>
                                <ClassDistributionChart dist={classDist} />
                            </Collapsible.Content>
                        </Collapsible.Root>
                    {/if}
                {:else}
                    <Empty.Root class="border border-dashed">
                        <Empty.Header>
                            <Empty.Media variant="icon"><ChartBarIcon /></Empty.Media>
                            <Empty.Title>No class averages yet</Empty.Title>
                            <Empty.Description>
                                Fill in the Class avg column for a graded component to see where you stand.
                            </Empty.Description>
                        </Empty.Header>
                    </Empty.Root>
                {/if}
            </Card.Content>
        </Card.Root>
    </main>
</div>

<ComponentSheet
    {course}
    comp={editingComp}
    open={editingId !== null && !!editingComp}
    onOpenChange={(o) => { if (!o) editingId = null; }}
/>
{:else}
<Empty.Root class="min-h-svh">
    <Empty.Header>
        <Empty.Title>Course not found</Empty.Title>
        <Empty.Description>This course doesn't exist or was deleted.</Empty.Description>
    </Empty.Header>
    <Empty.Content>
        <Button variant="outline" href="/">
            <ArrowLeftIcon data-icon="inline-start" />
            Back to courses
        </Button>
    </Empty.Content>
</Empty.Root>
{/if}
