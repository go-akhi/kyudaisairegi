import QRCode from "qrcode";
import { notFound } from "next/navigation";
import { StaffNav } from "@/components/staff-nav";
import { Badge, Button, Card, Field, TextLink, TopBar, field } from "@/components/ui";
import { requireStall } from "@/lib/auth";
import { requireMode } from "@/lib/device";
import { SALE_PRESETS, yen } from "@/lib/format";
import type { MenuItem } from "@/lib/menu-types";
import { getMenu, getStallById } from "@/lib/stalls";
import {
  addCategory,
  deleteCategory,
  deleteItem,
  saveItem,
  setOpen,
  setSale,
  toggleItem,
  updateStall,
} from "@/lib/actions/manage";

const ERRORS: Record<string, string> = {
  name: "The stall needs a name.",
  price: "Price must be a whole number of yen.",
  itemname: "The item needs a name.",
  image: "That image could not be read. Try a JPEG or PNG.",
  category: "The category needs a name.",
  sale: "Pick one of the discount presets.",
};

export default async function ManagePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const account = await requireStall();
  const device = await requireMode("front");
  const stall = await getStallById(account.stallId);
  if (!stall) notFound();

  const { categories, uncategorised } = await getMenu(stall.id);
  const { error, saved } = await searchParams;

  const publicUrl = `${process.env.APP_URL ?? "http://localhost:3000"}/s/${stall.slug}`;
  const qr = await QRCode.toString(publicUrl, {
    type: "svg",
    margin: 1,
    width: 220,
    color: { dark: "#1c1917", light: "#ffffff" },
  });

  const allItems = [...categories.flatMap((category) => category.items), ...uncategorised];

  return (
    <>
      <TopBar
        title="Manage"
        subtitle={`${stall.displayName} · ${device.label}`}
        right={<StaffNav mode="front" />}
      />

      <main className="mx-auto w-full max-w-3xl flex-1 space-y-5 px-4 py-5">
        {error ? (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {ERRORS[error] ?? "Something went wrong."}
          </p>
        ) : null}
        {saved ? (
          <p className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800">
            Saved.
          </p>
        ) : null}

        {/* ---------------------------------------------------------- status */}
        <Card className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold">Stall status</h2>
              <p className="text-sm text-stone-500">
                {stall.isOpen
                  ? "Marked open on the public menu."
                  : "Marked closed on the public menu."}
              </p>
            </div>
            <form action={setOpen}>
              {stall.isOpen ? (
                <Button
                  type="submit"
                  name="isOpen"
                  value="0"
                  variant="secondary"
                  size="lg"
                >
                  Close the stall
                </Button>
              ) : (
                <Button type="submit" name="isOpen" value="1" size="lg">
                  Open the stall
                </Button>
              )}
            </form>
          </div>

          <div className="mt-4 border-t border-stone-100 pt-4">
            <h3 className="text-sm font-semibold">Sale</h3>
            <p className="text-sm text-stone-500">
              Applies to new orders only. Tickets already in the queue keep the
              price they were placed at.
            </p>
            <form action={setSale} className="mt-2 flex flex-wrap gap-2">
              {SALE_PRESETS.map((pct) => (
                <Button
                  key={pct}
                  type="submit"
                  name="pct"
                  value={String(pct)}
                  variant={stall.salePct === pct ? "primary" : "secondary"}
                  size="lg"
                >
                  {pct === 0 ? "No sale" : `${pct}% off`}
                </Button>
              ))}
            </form>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 pt-4">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold">Public menu</h3>
              <TextLink href={`/s/${stall.slug}`} className="text-sm break-all">
                {publicUrl}
              </TextLink>
            </div>
            <details className="text-right">
              <summary className="cursor-pointer text-sm font-medium text-stone-700">
                Show QR
              </summary>
              <div
                className="mt-2 inline-block rounded-xl bg-white p-2 ring-1 ring-stone-200 [&_svg]:h-40 [&_svg]:w-40"
                dangerouslySetInnerHTML={{ __html: qr }}
              />
            </details>
          </div>
        </Card>

        {/* -------------------------------------------------------- settings */}
        <Card className="p-4">
          <h2 className="mb-3 font-semibold">Stall details</h2>
          <form action={updateStall} className="space-y-3" encType="multipart/form-data">
            <Field label="Stall name">
              <input name="displayName" defaultValue={stall.displayName} className={field} required />
            </Field>
            <Field label="Where to find you">
              <input
                name="locationNote"
                defaultValue={stall.locationNote}
                placeholder="Building A, 2F, by the stage"
                className={field}
                maxLength={120}
              />
            </Field>
            <Field label="Description">
              <textarea
                name="description"
                defaultValue={stall.description}
                rows={3}
                className={field}
                maxLength={600}
              />
            </Field>
            <Field label="Header photo" hint="Shown at the top of the public menu.">
              <input
                type="file"
                name="hero"
                accept="image/*"
                className="block w-full text-sm text-stone-600 file:mr-3 file:rounded-lg file:border-0 file:bg-stone-900 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white"
              />
            </Field>
            {stall.heroImage ? (
              <label className="flex items-center gap-2 text-sm text-stone-600">
                <input type="checkbox" name="removeHero" value="1" /> Remove current
                photo
              </label>
            ) : null}
            <Button type="submit">Save details</Button>
          </form>
        </Card>

        {/* ------------------------------------------------------ categories */}
        <Card className="p-4">
          <h2 className="mb-3 font-semibold">Categories</h2>
          <div className="flex flex-wrap gap-2">
            {categories.length === 0 ? (
              <p className="text-sm text-stone-500">No categories yet.</p>
            ) : null}
            {categories.map((category) => (
              <span
                key={category.id}
                className="inline-flex items-center gap-1 rounded-lg bg-stone-100 py-1 pr-1 pl-3 text-sm"
              >
                {category.name}
                <form action={deleteCategory}>
                  <input type="hidden" name="categoryId" value={category.id} />
                  <button
                    type="submit"
                    className="rounded-md px-2 py-0.5 text-stone-400 hover:bg-white hover:text-red-600"
                    aria-label={`Delete ${category.name}`}
                  >
                    ×
                  </button>
                </form>
              </span>
            ))}
          </div>
          <form action={addCategory} className="mt-3 flex gap-2">
            <input
              name="name"
              placeholder="New category"
              className={field}
              maxLength={60}
              required
            />
            <Button type="submit" variant="secondary">
              Add
            </Button>
          </form>
        </Card>

        {/* -------------------------------------------------------- new item */}
        <Card className="p-4">
          <h2 className="mb-3 font-semibold">Add an item</h2>
          <ItemForm categories={categories.map(({ id, name }) => ({ id, name }))} />
        </Card>

        {/* ------------------------------------------------------------ menu */}
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Menu</h2>
            <span className="text-sm text-stone-400">{allItems.length} items</span>
          </div>

          {allItems.length === 0 ? (
            <p className="text-sm text-stone-500">Nothing on the menu yet.</p>
          ) : (
            <ul className="space-y-2">
              {allItems.map((item) => (
                <li key={item.id}>
                  <details className="rounded-xl bg-stone-50 p-3">
                    <summary className="flex cursor-pointer items-center gap-3">
                      {item.imagePath ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={`/media/${item.imagePath}`}
                          alt=""
                          className="h-10 w-10 rounded-lg object-cover"
                        />
                      ) : (
                        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-stone-200 text-stone-400">
                          ·
                        </span>
                      )}
                      <span className="flex-1 font-medium">{item.name}</span>
                      {item.available ? (
                        <Badge tone="ok">Available</Badge>
                      ) : (
                        <Badge tone="warn">Sold out</Badge>
                      )}
                      <span className="w-20 text-right font-semibold">
                        {yen(item.priceYen)}
                      </span>
                    </summary>

                    <div className="mt-3 space-y-3">
                      <ItemForm
                        item={item}
                        categories={categories.map(({ id, name }) => ({ id, name }))}
                      />
                      <div className="flex gap-2 border-t border-stone-200 pt-3">
                        <form action={toggleItem}>
                          <input type="hidden" name="itemId" value={item.id} />
                          <input
                            type="hidden"
                            name="available"
                            value={item.available ? "0" : "1"}
                          />
                          <Button type="submit" variant="secondary" size="sm">
                            {item.available ? "Mark sold out" : "Mark available"}
                          </Button>
                        </form>
                        <form action={deleteItem}>
                          <input type="hidden" name="itemId" value={item.id} />
                          <Button type="submit" variant="danger" size="sm">
                            Delete
                          </Button>
                        </form>
                      </div>
                    </div>
                  </details>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </main>
    </>
  );
}

function ItemForm({
  item,
  categories,
}: {
  item?: MenuItem;
  categories: { id: string; name: string }[];
}) {
  return (
    <form action={saveItem} className="space-y-3" encType="multipart/form-data">
      {item ? <input type="hidden" name="itemId" value={item.id} /> : null}

      <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
        <Field label="Name">
          <input
            name="name"
            defaultValue={item?.name}
            className={field}
            maxLength={60}
            required
          />
        </Field>
        <Field label="Price (¥)">
          <input
            name="priceYen"
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            defaultValue={item?.priceYen ?? ""}
            className={field}
            required
          />
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Category">
          <select
            name="categoryId"
            defaultValue={item?.categoryId ?? ""}
            className={field}
          >
            <option value="">No category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Photo">
          <input
            type="file"
            name="image"
            accept="image/*"
            className="block w-full pt-1 text-sm text-stone-600 file:mr-3 file:rounded-lg file:border-0 file:bg-stone-900 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white"
          />
        </Field>
      </div>

      <Field label="Description">
        <input
          name="description"
          defaultValue={item?.description}
          className={field}
          maxLength={300}
        />
      </Field>

      <Field
        label="Options"
        hint="One per line, e.g. “Large +100”. Leave empty for none."
      >
        <textarea
          name="options"
          rows={2}
          defaultValue={item?.options
            .map((option) =>
              option.priceDeltaYen === 0
                ? option.name
                : `${option.name} ${option.priceDeltaYen > 0 ? "+" : "−"}${Math.abs(option.priceDeltaYen)}`,
            )
            .join("\n")}
          className={field}
          placeholder={"Large +100\nExtra sauce +50"}
        />
      </Field>

      <label className="flex items-center gap-2 text-sm text-stone-700">
        <input
          type="checkbox"
          name="available"
          defaultChecked={item ? item.available : true}
          className="h-4 w-4"
        />
        Available to order
      </label>

      {item?.imagePath ? (
        <label className="flex items-center gap-2 text-sm text-stone-600">
          <input type="checkbox" name="removeImage" value="1" /> Remove current photo
        </label>
      ) : null}

      <Button type="submit" variant={item ? "secondary" : "primary"}>
        {item ? "Save item" : "Add item"}
      </Button>
    </form>
  );
}
