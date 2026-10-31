<script lang="ts">
    import { grades, computeEffectiveCompPct, computeCourseTotals } from "$lib/stores/grades.svelte";
    import { getGradeColor, getLetterGrade } from "$lib/grading";
    import type { Course } from "$lib/types";
    import * as Card from "$lib/components/ui/card";
    import * as Tooltip from "$lib/components/ui/tooltip";
    import { Badge } from "$lib/components/ui/badge";
    import { Progress } from "$lib/components/ui/progress";
    import TriangleAlertIcon from "@lucide/svelte/icons/triangle-alert";

    interface Props {
        course: Course;
    }
    let { course }: Props = $props();

    const proj = $derived(grades.projectedGrade(course.id));
    const totalWeight = $derived(grades.totalWeight(course.id));
    const letter = $derived(getLetterGrade(proj.grade));
    const curved = $derived(grades.curvedGrade(course.id));
    const totals = $derived(computeCourseTotals(course));
    const pctOf = (points: number) => `${((points / (totals.totalWeight || 100)) * 100).toFixed(1)}%`;
</script>

<a href="/course/{course.id}" class="block h-full">
    <Card.Root class="h-full transition-colors hover:bg-muted/50">
        <Card.Header>
            <Card.Title class="font-mono">{course.name}</Card.Title>
            <Card.Description>{course.fullName}</Card.Description>
            <Card.Action class="flex gap-1">
                <Badge variant="secondary" class="font-mono">{letter}</Badge>
                {#if curved}
                    <Tooltip.Root>
                        <Tooltip.Trigger>
                            {#snippet child({ props })}
                                <Badge {...props} variant="outline" class="font-mono">
                                    {curved.letter}
                                </Badge>
                            {/snippet}
                        </Tooltip.Trigger>
                        <Tooltip.Content>Relative (curved) grade</Tooltip.Content>
                    </Tooltip.Root>
                {/if}
            </Card.Action>
        </Card.Header>

        <Card.Content class="flex flex-1 flex-col gap-4">
            {#if proj.grade !== null}
                <div
                    class="font-mono text-3xl font-semibold tabular-nums"
                    style="color: {getGradeColor(proj.grade)}"
                >
                    {proj.grade.toFixed(1)}%
                </div>
            {:else}
                <div class="text-muted-foreground text-sm">No scores yet</div>
            {/if}

            <div class="flex flex-col gap-2">
                {#each course.components as comp (comp.id)}
                    {@const pct = computeEffectiveCompPct(course, comp)}
                    <div class="grid grid-cols-[1fr_5rem_2.5rem] items-center gap-2">
                        <span class="text-muted-foreground truncate text-xs">{comp.name}</span>
                        <Progress value={pct ?? 0} />
                        <span class="text-muted-foreground text-right font-mono text-xs">
                            {comp.weight}%
                        </span>
                    </div>
                {/each}
            </div>
        </Card.Content>

        <Card.Footer class="justify-between">
            <span class="text-muted-foreground text-xs">
                <span class="text-foreground font-mono">{pctOf(totals.gained)}</span>
                of <span class="text-foreground font-mono">{pctOf(totals.graded)}</span> graded ·
                max <span class="text-foreground font-mono">{pctOf(totals.maxPossible)}</span>
            </span>
            {#if totalWeight !== 100}
                <Badge variant="destructive">
                    <TriangleAlertIcon data-icon="inline-start" />
                    {totalWeight}% total
                </Badge>
            {/if}
        </Card.Footer>
    </Card.Root>
</a>
