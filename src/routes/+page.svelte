<script lang="ts">
    import { grades } from "$lib/stores/grades.svelte";
    import CourseCard from "$lib/components/CourseCard.svelte";
    import { BRANCHES, getSemesters, getCourses } from "$lib/data/courses";
    import { page } from "$app/state";
    import { createBrowserClient } from "@supabase/ssr";
    import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from "$env/static/public";
    import { goto } from "$app/navigation";
    import * as Card from "$lib/components/ui/card";
    import * as Field from "$lib/components/ui/field";
    import * as Select from "$lib/components/ui/select";
    import * as ToggleGroup from "$lib/components/ui/toggle-group";
    import * as InputGroup from "$lib/components/ui/input-group";
    import * as Item from "$lib/components/ui/item";
    import * as Dialog from "$lib/components/ui/dialog";
    import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
    import * as Avatar from "$lib/components/ui/avatar";
    import * as Empty from "$lib/components/ui/empty";
    import { Button } from "$lib/components/ui/button";
    import { Input } from "$lib/components/ui/input";
    import { Badge } from "$lib/components/ui/badge";
    import { Spinner } from "$lib/components/ui/spinner";
    import PlusIcon from "@lucide/svelte/icons/plus";
    import RefreshCwIcon from "@lucide/svelte/icons/refresh-cw";
    import LogOutIcon from "@lucide/svelte/icons/log-out";
    import KeyRoundIcon from "@lucide/svelte/icons/key-round";
    import ApiTokensDialog from "$lib/components/ApiTokensDialog.svelte";

    let tokensOpen = $state(false);

    const supabase = createBrowserClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY);

    async function logout() {
        await supabase.auth.signOut();
        goto("/auth");
    }

    function getOverallGrade(): { grade: number | null; count: number } {
        let total = 0;
        let count = 0;
        for (const course of grades.courses) {
            const proj = grades.projectedGrade(course.id);
            if (proj.grade !== null) {
                total += proj.grade;
                count++;
            }
        }
        if (count === 0) return { grade: null, count: 0 };
        return { grade: total / count, count };
    }

    const overall = $derived(getOverallGrade());

    const courseColors = [
        "#22d3ee",
        "#a78bfa",
        "#34d399",
        "#fb923c",
        "#f472b6",
        "#60a5fa",
        "#f97316",
        "#10b981"
    ];

    function pickRandomColor(): string {
        return courseColors[Math.floor(Math.random() * courseColors.length)];
    }

    let addOpen = $state(false);
    let creatingCourse = $state(false);
    let newCourseName = $state("");
    let newCourseFullName = $state("");
    let newCourseColor = $state(pickRandomColor());

    function openAddCourse() {
        addOpen = true;
        newCourseColor = pickRandomColor();
    }

    function closeAddCourse() {
        addOpen = false;
        newCourseName = "";
        newCourseFullName = "";
        newCourseColor = pickRandomColor();
    }

    function onAddOpenChange(open: boolean) {
        if (open) openAddCourse();
        else closeAddCourse();
    }

    async function handleAddCourse(e?: Event) {
        e?.preventDefault();
        const name = newCourseName.trim();
        if (!name || creatingCourse) return;
        const fullName = newCourseFullName.trim() || name;
        creatingCourse = true;
        await grades.addCourse(name, fullName, newCourseColor || pickRandomColor());
        creatingCourse = false;
        closeAddCourse();
    }

    // ─── Onboarding state ───────────────────────────────────────────────────────

    let selectedBranch = $state("");
    let selectedSemester = $state("");
    let seeding = $state(false);

    // ─── Encryption key state ────────────────────────────────────────────────────
    // TODO:
    //  use ;P

    function generateKey(): string {
        const bytes = new Uint8Array(16);
        crypto.getRandomValues(bytes);
        return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    let useCustomKey = $state(false);
    let defaultKey = $state(generateKey());
    let customKey = $state("");
    const activeKey = $derived(useCustomKey ? customKey : defaultKey);

    const availableSemesters = $derived(
        selectedBranch ? getSemesters(selectedBranch) : []
    );
    const previewCourses = $derived(
        selectedBranch && selectedSemester
            ? getCourses(selectedBranch, selectedSemester)
            : []
    );

    async function handleSeed() {
        if (!selectedBranch || !selectedSemester || seeding) return;
        seeding = true;
        await grades.seedFromCatalog(selectedBranch, selectedSemester);
        seeding = false;
    }
</script>

<div class="flex min-h-svh flex-col">
    <header class="bg-background/80 sticky top-0 z-10 border-b backdrop-blur">
        <div class="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
            <div class="flex flex-col">
                <span class="font-mono font-semibold">tracksem</span>
                <span class="text-muted-foreground text-xs">sem 2 · {new Date().getFullYear()}</span>
            </div>

            <div class="flex items-center gap-3">
                {#if overall.grade !== null}
                    <Badge variant="secondary" class="font-mono">
                        avg {overall.grade.toFixed(1)}% · {overall.count} course{overall.count > 1 ? "s" : ""}
                    </Badge>
                {/if}

                <DropdownMenu.Root>
                    <DropdownMenu.Trigger>
                        {#snippet child({ props })}
                            <Button {...props} variant="ghost" size="icon" class="rounded-full" aria-label="Account">
                                <Avatar.Root>
                                    <Avatar.Fallback>
                                        {(page.data.user?.email ?? "?").slice(0, 1).toUpperCase()}
                                    </Avatar.Fallback>
                                </Avatar.Root>
                            </Button>
                        {/snippet}
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Content align="end">
                        <DropdownMenu.Group>
                            <DropdownMenu.Label class="truncate">{page.data.user?.email}</DropdownMenu.Label>
                        </DropdownMenu.Group>
                        <DropdownMenu.Separator />
                        <DropdownMenu.Group>
                            <DropdownMenu.Item onSelect={() => (tokensOpen = true)}>
                                <KeyRoundIcon />
                                API tokens
                            </DropdownMenu.Item>
                            <DropdownMenu.Item onSelect={logout}>
                                <LogOutIcon />
                                Sign out
                            </DropdownMenu.Item>
                        </DropdownMenu.Group>
                    </DropdownMenu.Content>
                </DropdownMenu.Root>
            </div>
        </div>
    </header>

    <main class="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8">
        {#if grades.courses.length === 0}
            <Card.Root class="mx-auto w-full max-w-lg">
                <Card.Header>
                    <Card.Title>Setup</Card.Title>
                    <Card.Description>Select your branch and semester to get started.</Card.Description>
                </Card.Header>
                <Card.Content>
                    <Field.FieldGroup>
                        <Field.FieldSet>
                            <Field.FieldLegend variant="label">Encryption key</Field.FieldLegend>
                            <ToggleGroup.Root
                                type="single"
                                variant="outline"
                                value={useCustomKey ? "custom" : "default"}
                                onValueChange={(v) => { if (v) useCustomKey = v === "custom"; }}
                            >
                                <ToggleGroup.Item value="default">Default</ToggleGroup.Item>
                                <ToggleGroup.Item value="custom">Custom</ToggleGroup.Item>
                            </ToggleGroup.Root>
                            {#if !useCustomKey}
                                <Field.Field>
                                    <InputGroup.Root>
                                        <InputGroup.Input class="font-mono" value={defaultKey} readonly aria-label="Generated key" />
                                        <InputGroup.Addon align="inline-end">
                                            <InputGroup.Button
                                                size="icon-xs"
                                                aria-label="Regenerate key"
                                                onclick={() => { defaultKey = generateKey(); }}
                                            >
                                                <RefreshCwIcon />
                                            </InputGroup.Button>
                                        </InputGroup.Addon>
                                    </InputGroup.Root>
                                    <Field.FieldDescription>
                                        A random key has been generated for you. Your data is encrypted before leaving your device.
                                    </Field.FieldDescription>
                                </Field.Field>
                            {:else}
                                <Field.Field>
                                    <Input
                                        class="font-mono"
                                        placeholder="Enter your own key (min 8 chars)"
                                        bind:value={customKey}
                                        spellcheck="false"
                                        autocomplete="off"
                                        aria-label="Custom key"
                                    />
                                    <Field.FieldDescription>
                                        Use your own passphrase. Only you can decrypt your data.
                                    </Field.FieldDescription>
                                </Field.Field>
                            {/if}
                        </Field.FieldSet>

                        <Field.Field>
                            <Field.FieldLabel>Branch</Field.FieldLabel>
                            <Select.Root
                                type="single"
                                bind:value={selectedBranch}
                                onValueChange={() => { selectedSemester = ""; }}
                            >
                                <Select.Trigger class="w-full">
                                    {selectedBranch || "Select branch"}
                                </Select.Trigger>
                                <Select.Content>
                                    <Select.Group>
                                        {#each BRANCHES as branch (branch)}
                                            <Select.Item value={branch}>{branch}</Select.Item>
                                        {/each}
                                    </Select.Group>
                                </Select.Content>
                            </Select.Root>
                        </Field.Field>

                        {#if selectedBranch}
                            <Field.Field>
                                <Field.FieldLabel>Semester</Field.FieldLabel>
                                <Select.Root type="single" bind:value={selectedSemester}>
                                    <Select.Trigger class="w-full">
                                        {selectedSemester || "Select semester"}
                                    </Select.Trigger>
                                    <Select.Content>
                                        <Select.Group>
                                            {#each availableSemesters as sem (sem)}
                                                <Select.Item value={sem}>{sem}</Select.Item>
                                            {/each}
                                        </Select.Group>
                                    </Select.Content>
                                </Select.Root>
                            </Field.Field>
                        {/if}

                        {#if previewCourses.length > 0}
                            <Field.FieldSet>
                                <Field.FieldLegend variant="label">Courses to add</Field.FieldLegend>
                                <Item.Group class="gap-2">
                                    {#each previewCourses as c (c.name)}
                                        <Item.Root variant="outline" size="sm">
                                            <Item.Content>
                                                <Item.Title class="font-mono">{c.name}</Item.Title>
                                                <Item.Description>{c.fullName}</Item.Description>
                                            </Item.Content>
                                            <Item.Actions>
                                                <Badge variant="secondary">
                                                    {c.components.length > 0 ? `${c.components.length} components` : "defaults"}
                                                </Badge>
                                            </Item.Actions>
                                        </Item.Root>
                                    {/each}
                                </Item.Group>
                            </Field.FieldSet>
                        {/if}
                    </Field.FieldGroup>
                </Card.Content>
                {#if previewCourses.length > 0}
                    <Card.Footer>
                        <Button class="w-full" disabled={seeding} onclick={handleSeed}>
                            {#if seeding}
                                <Spinner data-icon="inline-start" />
                                Setting up…
                            {:else}
                                Confirm
                            {/if}
                        </Button>
                    </Card.Footer>
                {/if}
            </Card.Root>
        {:else}
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {#each grades.courses as course (course.id)}
                    <CourseCard {course} />
                {/each}

                <Empty.Root class="border border-dashed">
                    <Empty.Header>
                        <Empty.Title>Add a course</Empty.Title>
                        <Empty.Description>Defaults: Quiz ×2 · Midsem · Endsem</Empty.Description>
                    </Empty.Header>
                    <Empty.Content>
                        <Button variant="outline" onclick={openAddCourse}>
                            <PlusIcon data-icon="inline-start" />
                            Add course
                        </Button>
                    </Empty.Content>
                </Empty.Root>
            </div>

            <p class="text-muted-foreground text-center text-sm">
                Click a course to enter scores and manage components.
            </p>
        {/if}
    </main>
</div>

<Dialog.Root open={addOpen} onOpenChange={onAddOpenChange}>
    <Dialog.Content class="sm:max-w-md">
        <form onsubmit={handleAddCourse} class="flex flex-col gap-6">
            <Dialog.Header>
                <Dialog.Title>Add course</Dialog.Title>
                <Dialog.Description>New courses start with Quiz ×2 · Midsem · Endsem.</Dialog.Description>
            </Dialog.Header>
            <Field.FieldGroup>
                <Field.Field>
                    <Field.FieldLabel for="course-name">Short name</Field.FieldLabel>
                    <Input id="course-name" placeholder="e.g. DSA" bind:value={newCourseName} />
                </Field.Field>
                <Field.Field>
                    <Field.FieldLabel for="course-full-name">Full name</Field.FieldLabel>
                    <Input id="course-full-name" placeholder="Data Structures and Algorithms" bind:value={newCourseFullName} />
                </Field.Field>
            </Field.FieldGroup>
            <Dialog.Footer>
                <Button type="button" variant="outline" disabled={creatingCourse} onclick={closeAddCourse}>
                    Cancel
                </Button>
                <Button type="submit" disabled={creatingCourse || newCourseName.trim().length === 0}>
                    {#if creatingCourse}
                        <Spinner data-icon="inline-start" />
                        Adding…
                    {:else}
                        Create
                    {/if}
                </Button>
            </Dialog.Footer>
        </form>
    </Dialog.Content>
</Dialog.Root>

<ApiTokensDialog open={tokensOpen} onOpenChange={(o) => (tokensOpen = o)} />
