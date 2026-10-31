<script lang="ts">
    import * as Dialog from "$lib/components/ui/dialog";
    import * as Field from "$lib/components/ui/field";
    import * as InputGroup from "$lib/components/ui/input-group";
    import * as Item from "$lib/components/ui/item";
    import * as Alert from "$lib/components/ui/alert";
    import * as Empty from "$lib/components/ui/empty";
    import { Button } from "$lib/components/ui/button";
    import { Input } from "$lib/components/ui/input";
    import { Spinner } from "$lib/components/ui/spinner";
    import { toast } from "svelte-sonner";
    import CopyIcon from "@lucide/svelte/icons/copy";
    import KeyRoundIcon from "@lucide/svelte/icons/key-round";
    import TrashIcon from "@lucide/svelte/icons/trash-2";

    interface Props {
        open: boolean;
        onOpenChange: (open: boolean) => void;
    }
    let { open, onOpenChange }: Props = $props();

    type TokenRow = { id: string; name: string; prefix: string; created_at: string; last_used_at: string | null };

    let tokens = $state<TokenRow[] | null>(null);
    let name = $state("Claude");
    let creating = $state(false);
    let newToken = $state<string | null>(null);

    async function load() {
        const res = await fetch("/api/tokens");
        tokens = res.ok ? await res.json() : [];
        if (!res.ok) toast.error("Couldn't load your tokens", { description: "Has the api_tokens migration been run?" });
    }

    $effect(() => {
        if (open) {
            newToken = null;
            load();
        }
    });

    async function create(e: Event) {
        e.preventDefault();
        creating = true;
        try {
            const res = await fetch("/api/tokens", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name }),
            });
            if (!res.ok) throw new Error(String(res.status));
            const created = await res.json();
            newToken = created.token;
            await load();
        } catch {
            toast.error("Couldn't create a token");
        } finally {
            creating = false;
        }
    }

    async function revoke(id: string) {
        const res = await fetch("/api/tokens", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id }),
        });
        if (res.ok) {
            toast.success("Token revoked");
            await load();
        } else toast.error("Couldn't revoke the token");
    }

    async function copy() {
        if (!newToken) return;
        await navigator.clipboard.writeText(newToken);
        toast.success("Token copied");
    }

    function when(iso: string | null): string {
        return iso ? new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "never";
    }
</script>

<Dialog.Root {open} {onOpenChange}>
    <Dialog.Content class="sm:max-w-lg">
        <Dialog.Header>
            <Dialog.Title>API tokens</Dialog.Title>
            <Dialog.Description>
                Let Claude (or any script) read and fill in your scores. A token can change all of your grade data, so keep it private.
            </Dialog.Description>
        </Dialog.Header>

        {#if newToken}
            <Alert.Root>
                <KeyRoundIcon />
                <Alert.Title>Copy your token now</Alert.Title>
                <Alert.Description class="flex flex-col gap-2">
                    You won't be able to see it again.
                    <InputGroup.Root>
                        <InputGroup.Input readonly class="font-mono text-xs" value={newToken} aria-label="New token" />
                        <InputGroup.Addon align="inline-end">
                            <InputGroup.Button size="icon-xs" aria-label="Copy token" onclick={copy}>
                                <CopyIcon />
                            </InputGroup.Button>
                        </InputGroup.Addon>
                    </InputGroup.Root>
                </Alert.Description>
            </Alert.Root>
        {/if}

        <form onsubmit={create}>
            <Field.Field orientation="horizontal">
                <Input aria-label="Token name" placeholder="Token name" bind:value={name} maxlength={60} />
                <Button type="submit" disabled={creating}>
                    {#if creating}<Spinner data-icon="inline-start" />{/if}
                    Create token
                </Button>
            </Field.Field>
        </form>

        {#if tokens === null}
            <div class="flex justify-center py-4"><Spinner /></div>
        {:else if tokens.length === 0}
            <Empty.Root class="border border-dashed">
                <Empty.Header>
                    <Empty.Title>No tokens yet</Empty.Title>
                    <Empty.Description>Create one to use the tracksem Claude skill.</Empty.Description>
                </Empty.Header>
            </Empty.Root>
        {:else}
            <Item.Group class="gap-2">
                {#each tokens as t (t.id)}
                    <Item.Root variant="outline" size="sm">
                        <Item.Content>
                            <Item.Title>{t.name}</Item.Title>
                            <Item.Description class="font-mono text-xs">
                                {t.prefix}… · created {when(t.created_at)} · last used {when(t.last_used_at)}
                            </Item.Description>
                        </Item.Content>
                        <Item.Actions>
                            <Button variant="ghost" size="icon-sm" aria-label="Revoke {t.name}" onclick={() => revoke(t.id)}>
                                <TrashIcon />
                            </Button>
                        </Item.Actions>
                    </Item.Root>
                {/each}
            </Item.Group>
        {/if}
    </Dialog.Content>
</Dialog.Root>
