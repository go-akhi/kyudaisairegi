import QRCode from "qrcode";
import { notFound } from "next/navigation";
import { StaffNav } from "@/components/staff-nav";
import { Badge, Button, Card, Field, TextLink, TopBar, field } from "@/components/ui";
import { requireStall } from "@/lib/auth";
import { requireMode } from "@/lib/device";
import { SALE_PRESETS, yen } from "@/lib/format";
import { fill, type Dict } from "@/lib/i18n/dictionaries";
import { getDict } from "@/lib/i18n/locale";
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

export default async function ManagePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const account = await requireStall();
  const device = await requireMode("front");
  const { t } = await getDict();
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
  const errorMessage = error
    ? (t.manage.errors as Record<string, string>)[error] ?? t.manage.errors.generic
    : null;

  return (
    <>
      <TopBar
        title={t.manage.title}
        subtitle={`${stall.displayName} · ${device.label}`}
        right={<StaffNav mode="front" />}
      />

      <main className="mx-auto w-full max-w-3xl flex-1 space-y-5 px-4 py-5">
        {errorMessage ? (
          <p className="rounded-lg bg-[#f9e7e2] px-4 py-3 text-sm text-[#8f2a20]">
            {errorMessage}
          </p>
        ) : null}
        {saved ? (
          <p className="rounded-lg bg-[#eef4f4] px-4 py-3 text-sm text-[#15505e]">
            {t.manage.saved}
          </p>
        ) : null}

        {/* ---------------------------------------------------------- status */}
        <Card className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold">{t.manage.status}</h2>
              <p className="text-sm text-[#856f58]">
                {stall.isOpen ? t.manage.markedOpen : t.manage.markedClosed}
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
                  {t.manage.closeStall}
                </Button>
              ) : (
                <Button type="submit" name="isOpen" value="1" size="lg">
                  {t.manage.openStall}
                </Button>
              )}
            </form>
          </div>

          <div className="mt-4 border-t border-[#efe5d4] pt-4">
            <h3 className="text-sm font-semibold">{t.manage.sale}</h3>
            <p className="text-sm text-[#856f58]">{t.manage.saleHelp}</p>
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
                  {pct === 0 ? t.manage.noSale : fill(t.manage.pctOff, { pct })}
                </Button>
              ))}
            </form>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#efe5d4] pt-4">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold">{t.manage.publicMenu}</h3>
              <TextLink href={`/s/${stall.slug}`} className="text-sm break-all">
                {publicUrl}
              </TextLink>
            </div>
            <details className="text-right">
              <summary className="cursor-pointer text-sm font-medium text-[#614b37]">
                {t.manage.showQr}
              </summary>
              <div
                className="mt-2 inline-block rounded-lg bg-white p-2 ring-1 ring-[#e7dcc7] [&_svg]:h-40 [&_svg]:w-40"
                dangerouslySetInnerHTML={{ __html: qr }}
              />
            </details>
          </div>
        </Card>

        {/* -------------------------------------------------------- settings */}
        <Card className="p-4">
          <h2 className="mb-3 font-semibold">{t.manage.details}</h2>
          <form action={updateStall} className="space-y-3">
            <Field label={t.manage.stallName}>
              <input name="displayName" defaultValue={stall.displayName} className={field} required />
            </Field>
            <Field label={t.manage.where}>
              <input
                name="locationNote"
                defaultValue={stall.locationNote}
                placeholder={t.manage.wherePlaceholder}
                className={field}
                maxLength={120}
              />
            </Field>
            <Field label={t.manage.description}>
              <textarea
                name="description"
                defaultValue={stall.description}
                rows={3}
                className={field}
                maxLength={600}
              />
            </Field>
            <Field label={t.manage.headerPhoto} hint={t.manage.headerPhotoHint}>
              <input
                type="file"
                name="hero"
                accept="image/*"
                className="block w-full text-sm text-[#6b5544] file:mr-3 file:rounded-lg file:border-0 file:bg-[#402000] file:px-3 file:py-2 file:text-sm file:font-medium file:text-[#fffef6]"
              />
            </Field>
            {stall.heroImage ? (
              <label className="flex items-center gap-2 text-sm text-[#6b5544]">
                <input type="checkbox" name="removeHero" value="1" />{" "}
                {t.manage.removePhoto}
              </label>
            ) : null}
            <Button type="submit">{t.manage.saveDetails}</Button>
          </form>
        </Card>

        {/* ------------------------------------------------------ categories */}
        <Card className="p-4">
          <h2 className="mb-3 font-semibold">{t.manage.categories}</h2>
          <div className="flex flex-wrap gap-2">
            {categories.length === 0 ? (
              <p className="text-sm text-[#856f58]">{t.manage.noCategories}</p>
            ) : null}
            {categories.map((category) => (
              <span
                key={category.id}
                className="inline-flex items-center gap-1 rounded-lg bg-[#f4ecdd] py-1 pr-1 pl-3 text-sm"
              >
                {category.name}
                <form action={deleteCategory}>
                  <input type="hidden" name="categoryId" value={category.id} />
                  <button
                    type="submit"
                    className="rounded-md px-2 py-0.5 text-[#a08a72] hover:bg-white hover:text-[#b3261e]"
                    aria-label={`${t.common.delete} ${category.name}`}
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
              placeholder={t.manage.newCategory}
              className={field}
              maxLength={60}
              required
            />
            <Button type="submit" variant="secondary">
              {t.common.add}
            </Button>
          </form>
        </Card>

        {/* -------------------------------------------------------- new item */}
        <Card className="p-4">
          <h2 className="mb-3 font-semibold">{t.manage.addItem}</h2>
          <ItemForm
            categories={categories.map(({ id, name }) => ({ id, name }))}
            t={t}
          />
        </Card>

        {/* ------------------------------------------------------------ menu */}
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">{t.manage.menu}</h2>
            <span className="text-sm text-[#a08a72]">
              {fill(t.manage.itemsCount, { n: allItems.length })}
            </span>
          </div>

          {allItems.length === 0 ? (
            <p className="text-sm text-[#856f58]">{t.manage.nothingOnMenu}</p>
          ) : (
            <ul className="space-y-2">
              {allItems.map((item) => (
                <li key={item.id}>
                  <details className="rounded-lg bg-[#fbf6ea] p-3">
                    <summary className="flex cursor-pointer items-center gap-3">
                      {item.imagePath ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={`/media/${item.imagePath}`}
                          alt=""
                          className="h-10 w-10 rounded-lg object-cover"
                        />
                      ) : (
                        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#eadfcc] text-[#a08a72]">
                          ·
                        </span>
                      )}
                      <span className="flex-1 font-medium">{item.name}</span>
                      {item.available ? (
                        <Badge tone="ok">{t.manage.available}</Badge>
                      ) : (
                        <Badge tone="warn">{t.manage.soldOut}</Badge>
                      )}
                      <span className="w-20 text-right font-semibold">
                        {yen(item.priceYen)}
                      </span>
                    </summary>

                    <div className="mt-3 space-y-3">
                      <ItemForm
                        item={item}
                        categories={categories.map(({ id, name }) => ({ id, name }))}
                        t={t}
                      />
                      <div className="flex gap-2 border-t border-[#e7dcc7] pt-3">
                        <form action={toggleItem}>
                          <input type="hidden" name="itemId" value={item.id} />
                          <input
                            type="hidden"
                            name="available"
                            value={item.available ? "0" : "1"}
                          />
                          <Button type="submit" variant="secondary" size="sm">
                            {item.available ? t.manage.markSoldOut : t.manage.markAvailable}
                          </Button>
                        </form>
                        <form action={deleteItem}>
                          <input type="hidden" name="itemId" value={item.id} />
                          <Button type="submit" variant="danger" size="sm">
                            {t.common.delete}
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
  t,
}: {
  item?: MenuItem;
  categories: { id: string; name: string }[];
  t: Dict;
}) {
  return (
    <form action={saveItem} className="space-y-3">
      {item ? <input type="hidden" name="itemId" value={item.id} /> : null}

      <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
        <Field label={t.manage.name}>
          <input
            name="name"
            defaultValue={item?.name}
            className={field}
            maxLength={60}
            required
          />
        </Field>
        <Field label={t.manage.price}>
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
        <Field label={t.manage.category}>
          <select
            name="categoryId"
            defaultValue={item?.categoryId ?? ""}
            className={field}
          >
            <option value="">{t.manage.noCategory}</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t.manage.photo}>
          <input
            type="file"
            name="image"
            accept="image/*"
            className="block w-full pt-1 text-sm text-[#6b5544] file:mr-3 file:rounded-lg file:border-0 file:bg-[#402000] file:px-3 file:py-2 file:text-sm file:font-medium file:text-[#fffef6]"
          />
        </Field>
      </div>

      <Field label={t.manage.description}>
        <input
          name="description"
          defaultValue={item?.description}
          className={field}
          maxLength={300}
        />
      </Field>

      <Field label={t.manage.options} hint={t.manage.optionsHint}>
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
          placeholder={t.manage.optionsPlaceholder}
        />
      </Field>

      <label className="flex items-center gap-2 text-sm text-[#614b37]">
        <input
          type="checkbox"
          name="available"
          defaultChecked={item ? item.available : true}
          className="h-4 w-4"
        />
        {t.manage.availableToOrder}
      </label>

      {item?.imagePath ? (
        <label className="flex items-center gap-2 text-sm text-[#6b5544]">
          <input type="checkbox" name="removeImage" value="1" />{" "}
          {t.manage.removePhoto}
        </label>
      ) : null}

      <Button type="submit" variant={item ? "secondary" : "primary"}>
        {item ? t.manage.saveItem : t.manage.addItemBtn}
      </Button>
    </form>
  );
}
