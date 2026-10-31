<script lang="ts">
    import { grades } from "$lib/stores/grades.svelte";
    import type { Course, Component, SubItem } from "$lib/types";
    import * as Sheet from "$lib/components/ui/sheet";
    import * as Field from "$lib/components/ui/field";
    import * as InputGroup from "$lib/components/ui/input-group";
    import * as ToggleGroup from "$lib/components/ui/toggle-group";
    import * as NativeSelect from "$lib/components/ui/native-select";
    import * as Collapsible from "$lib/components/ui/collapsible";
    import * as Item from "$lib/components/ui/item";
    import { Button } from "$lib/components/ui/button";
    import { Input } from "$lib/components/ui/input";
    import ScoreInput from "$lib/components/ScoreInput.svelte";
    import PlusIcon from "@lucide/svelte/icons/plus";
    import XIcon from "@lucide/svelte/icons/x";
    import TrashIcon from "@lucide/svelte/icons/trash-2";
    import ChevronDownIcon from "@lucide/svelte/icons/chevron-down";

    interface Props {
        course: Course;
        comp: Component | undefined;
        open: boolean;
        onOpenChange: (open: boolean) => void;
    }
    let { course, comp, open, onOpenChange }: Props = $props();

    const hasParts = $derived(!!comp?.subItems && comp.subItems.length > 0);
    const perPart = $derived(hasParts && comp?.statsMode === "per-sub");
    let advancedOpen = $state(false);

    function val(e: Event): string {
        return (e.currentTarget as HTMLInputElement | HTMLSelectElement).value;
    }
    function num(e: Event): number | null {
        const v = val(e).trim();
        if (v === "") return null;
        const n = parseFloat(v);
        return isNaN(n) || n < 0 ? null : n;
    }

    type StatField = "classAvg" | "classMedian" | "classMax" | "classStdDev";
    function setCompStat(c: Component, field: StatField, value: number | null) {
        grades.updateClassStats(course.id, c.id, field, value);
    }
    function setSubStat(c: Component, s: SubItem, field: StatField, value: number | null) {
        grades.updateSubClassStats(course.id, c.id, s.id, field, value);
    }
</script>

{#snippet scaleOptions(excludeCompId: string, excludeSubId: string | null)}
    <NativeSelect.Option value="">Off</NativeSelect.Option>
    {#each course.components as target (target.id)}
        {#if target.id !== excludeCompId}
            <NativeSelect.Option value={target.id}>{target.name}</NativeSelect.Option>
        {/if}
        {#each target.subItems ?? [] as ts (ts.id)}
            {#if ts.id !== excludeSubId && (excludeSubId !== null || target.id !== excludeCompId)}
                <NativeSelect.Option value={ts.id}>{target.name} › {ts.name}</NativeSelect.Option>
            {/if}
        {/each}
    {/each}
{/snippet}

{#snippet statFields(
    max: number,
    stats: { classAvg?: number | null; classMedian?: number | null; classMax?: number | null; classStdDev?: number | null },
    set: (field: StatField, value: number | null) => void,
    idPrefix: string,
)}
    <div class="grid grid-cols-2 gap-3">
        <Field.Field>
            <Field.FieldLabel for="{idPrefix}-avg">Class average</Field.FieldLabel>
            <ScoreInput id="{idPrefix}-avg" aria-label="Class average" value={stats.classAvg} {max} onCommit={(p) => set("classAvg", p.score)} />
        </Field.Field>
        <Field.Field>
            <Field.FieldLabel for="{idPrefix}-median">Median</Field.FieldLabel>
            <ScoreInput id="{idPrefix}-median" aria-label="Class median" placeholder="optional" value={stats.classMedian} {max} onCommit={(p) => set("classMedian", p.score)} />
        </Field.Field>
        <Field.Field>
            <Field.FieldLabel for="{idPrefix}-high">Highest</Field.FieldLabel>
            <ScoreInput id="{idPrefix}-high" aria-label="Class highest" placeholder="optional" value={stats.classMax} {max} onCommit={(p) => set("classMax", p.score)} />
        </Field.Field>
        <Field.Field>
            <Field.FieldLabel for="{idPrefix}-sd">Spread (σ)</Field.FieldLabel>
            <Input
                id="{idPrefix}-sd"
                inputmode="decimal"
                class="font-mono"
                placeholder="auto"
                value={stats.classStdDev ?? ""}
                onchange={(e) => set("classStdDev", num(e))}
            />
        </Field.Field>
    </div>
{/snippet}

<Sheet.Root {open} {onOpenChange}>
    <Sheet.Content class="w-full gap-0 overflow-y-auto sm:max-w-md">
        {#if comp}
            {@const c = comp}
            <Sheet.Header>
                <Sheet.Title>{c.name}</Sheet.Title>
                <Sheet.Description>Everything you can change about this component.</Sheet.Description>
            </Sheet.Header>

            <div class="flex flex-col gap-8 px-4 pb-4">
                <Field.FieldGroup>
                    <Field.Field>
                        <Field.FieldLabel for="cs-name">Name</Field.FieldLabel>
                        <Input id="cs-name" value={c.name} onchange={(e) => grades.updateName(course.id, c.id, val(e))} />
                    </Field.Field>
                    <div class="grid grid-cols-2 gap-3">
                        <Field.Field>
                            <Field.FieldLabel for="cs-weight">Weight</Field.FieldLabel>
                            <InputGroup.Root>
                                <InputGroup.Input
                                    id="cs-weight"
                                    inputmode="decimal"
                                    class="font-mono"
                                    value={c.weight}
                                    onchange={(e) => {
                                        const n = num(e);
                                        if (n !== null && n <= 100) grades.updateWeight(course.id, c.id, n);
                                    }}
                                />
                                <InputGroup.Addon align="inline-end"><InputGroup.Text>%</InputGroup.Text></InputGroup.Addon>
                            </InputGroup.Root>
                        </Field.Field>
                        {#if !hasParts}
                            <Field.Field>
                                <Field.FieldLabel for="cs-max">Out of</Field.FieldLabel>
                                <Input
                                    id="cs-max"
                                    inputmode="decimal"
                                    class="font-mono"
                                    value={c.maxScore}
                                    onchange={(e) => {
                                        const n = num(e);
                                        if (n !== null && n > 0) grades.updateMaxScore(course.id, c.id, n);
                                    }}
                                />
                            </Field.Field>
                        {/if}
                    </div>
                </Field.FieldGroup>

                <Field.FieldSet>
                    <Field.FieldLegend>Parts</Field.FieldLegend>
                    <Field.FieldDescription>
                        Split this into separately graded parts, like Quiz 1 and Quiz 2.
                    </Field.FieldDescription>
                    {#if hasParts}
                        <Item.Group class="gap-2">
                            {#each c.subItems! as s (s.id)}
                                <Item.Root variant="outline" size="sm">
                                    <Item.Content class="flex-row gap-2">
                                        <Input
                                            aria-label="Part name"
                                            value={s.name}
                                            onchange={(e) => grades.updateSubName(course.id, c.id, s.id, val(e))}
                                        />
                                        <InputGroup.Root class="w-28 shrink-0">
                                            <InputGroup.Addon><InputGroup.Text>/</InputGroup.Text></InputGroup.Addon>
                                            <InputGroup.Input
                                                aria-label="Out of"
                                                inputmode="decimal"
                                                class="font-mono"
                                                value={s.maxScore}
                                                onchange={(e) => {
                                                    const n = num(e);
                                                    if (n !== null && n > 0) grades.updateSubMaxScore(course.id, c.id, s.id, n);
                                                }}
                                            />
                                        </InputGroup.Root>
                                    </Item.Content>
                                    <Item.Actions>
                                        <Button
                                            variant="ghost"
                                            size="icon-sm"
                                            aria-label="Remove {s.name}"
                                            onclick={() => grades.removeSubItem(course.id, c.id, s.id)}
                                        >
                                            <XIcon />
                                        </Button>
                                    </Item.Actions>
                                </Item.Root>
                            {/each}
                        </Item.Group>
                    {/if}
                    <Button variant="outline" size="sm" class="self-start" onclick={() => grades.addSubItem(course.id, c.id)}>
                        <PlusIcon data-icon="inline-start" />
                        Add part
                    </Button>

                    {#if hasParts}
                        <Field.Field>
                            <Field.FieldLabel>Counting</Field.FieldLabel>
                            <div class="flex flex-wrap items-center gap-2">
                                <ToggleGroup.Root
                                    type="single"
                                    variant="outline"
                                    size="sm"
                                    value={c.bestOf !== undefined ? "best" : "all"}
                                    onValueChange={(v) => {
                                        if (v === "all") grades.updateBestOf(course.id, c.id, undefined);
                                        else if (v === "best") grades.updateBestOf(course.id, c.id, Math.max(1, c.subItems!.length - 1));
                                    }}
                                >
                                    <ToggleGroup.Item value="all">Average all</ToggleGroup.Item>
                                    <ToggleGroup.Item value="best">Best of</ToggleGroup.Item>
                                </ToggleGroup.Root>
                                {#if c.bestOf !== undefined}
                                    <InputGroup.Root class="w-28">
                                        <InputGroup.Input
                                            aria-label="Best how many"
                                            inputmode="numeric"
                                            class="font-mono"
                                            value={c.bestOf}
                                            onchange={(e) => {
                                                const n = parseInt(val(e));
                                                if (n > 0 && n <= c.subItems!.length) grades.updateBestOf(course.id, c.id, n);
                                            }}
                                        />
                                        <InputGroup.Addon align="inline-end">
                                            <InputGroup.Text>of {c.subItems!.length}</InputGroup.Text>
                                        </InputGroup.Addon>
                                    </InputGroup.Root>
                                {/if}
                            </div>
                        </Field.Field>
                    {/if}
                </Field.FieldSet>

                <Field.FieldSet>
                    <Field.FieldLegend>Class statistics</Field.FieldLegend>
                    <Field.FieldDescription>
                        Used for the curved grade and the class distribution. Type marks, a fraction like 23/30, or a percentage like 70%.
                    </Field.FieldDescription>
                    {#if hasParts}
                        <ToggleGroup.Root
                            type="single"
                            variant="outline"
                            size="sm"
                            value={perPart ? "per-sub" : "global"}
                            onValueChange={(v) => {
                                if (v === "global" || v === "per-sub") grades.updateStatsMode(course.id, c.id, v);
                            }}
                        >
                            <ToggleGroup.Item value="global">For the whole component</ToggleGroup.Item>
                            <ToggleGroup.Item value="per-sub">For each part</ToggleGroup.Item>
                        </ToggleGroup.Root>
                    {/if}
                    {#if c.scaleTargetId}
                        <Field.FieldDescription>Scaled from another item, so its class statistics are used.</Field.FieldDescription>
                    {:else if perPart}
                        {#each c.subItems! as s (s.id)}
                            <Field.FieldSet>
                                <Field.FieldLegend variant="label">{s.name}</Field.FieldLegend>
                                {#if s.scaleTargetId}
                                    <Field.FieldDescription>Scaled from another item.</Field.FieldDescription>
                                {:else}
                                    {@render statFields(s.maxScore, s, (f, v) => setSubStat(c, s, f, v), `cs-${s.id}`)}
                                {/if}
                            </Field.FieldSet>
                        {/each}
                    {:else}
                        {@render statFields(c.maxScore, c, (f, v) => setCompStat(c, f, v), "cs-comp")}
                    {/if}
                </Field.FieldSet>

                <Collapsible.Root bind:open={advancedOpen}>
                    <Collapsible.Trigger>
                        {#snippet child({ props })}
                            <Button {...props} variant="ghost" size="sm" class="-ml-2">
                                <ChevronDownIcon data-icon="inline-start" class={advancedOpen ? "" : "-rotate-90"} />
                                Scaling
                            </Button>
                        {/snippet}
                    </Collapsible.Trigger>
                    <Collapsible.Content>
                        <Field.FieldGroup class="pt-3">
                            <Field.Field>
                                <Field.FieldLabel for="cs-scale">Take this component's marks from</Field.FieldLabel>
                                <NativeSelect.Root
                                    id="cs-scale"
                                    class="w-full"
                                    value={c.scaleTargetId ?? ""}
                                    onchange={(e) => grades.updateScaleTarget(course.id, c.id, val(e) || null)}
                                >
                                    {@render scaleOptions(c.id, null)}
                                </NativeSelect.Root>
                                <Field.FieldDescription>
                                    For example, a quiz you skipped that is graded from your endsem.
                                </Field.FieldDescription>
                            </Field.Field>
                            {#if hasParts && !c.scaleTargetId}
                                {#each c.subItems! as s (s.id)}
                                    <Field.Field>
                                        <Field.FieldLabel for="cs-scale-{s.id}">Take {s.name}'s marks from</Field.FieldLabel>
                                        <NativeSelect.Root
                                            id="cs-scale-{s.id}"
                                            class="w-full"
                                            value={s.scaleTargetId ?? ""}
                                            onchange={(e) => grades.updateSubScaleTarget(course.id, c.id, s.id, val(e) || null)}
                                        >
                                            {@render scaleOptions(c.id, s.id)}
                                        </NativeSelect.Root>
                                    </Field.Field>
                                {/each}
                            {/if}
                        </Field.FieldGroup>
                    </Collapsible.Content>
                </Collapsible.Root>
            </div>

            <Sheet.Footer class="flex-row justify-between border-t">
                <Button
                    variant="destructive"
                    onclick={() => {
                        onOpenChange(false);
                        grades.removeComponent(course.id, c.id);
                    }}
                >
                    <TrashIcon data-icon="inline-start" />
                    Remove
                </Button>
                <Sheet.Close>
                    {#snippet child({ props })}
                        <Button {...props}>Done</Button>
                    {/snippet}
                </Sheet.Close>
            </Sheet.Footer>
        {/if}
    </Sheet.Content>
</Sheet.Root>
