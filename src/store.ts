import { create } from "zustand";
import { db, init, type Category, type Doc } from "./services/storage";
export const useApp = create<{
  docs: Doc[];
  categories: Category[];
  theme: string;
  ready: boolean;
  refresh: () => Promise<void>;
  setTheme: (theme: string) => Promise<void>;
}>((set) => ({
  docs: [],
  categories: [],
  theme: "system",
  ready: false,
  refresh: async () => {
    await init();
    const d = await db();
    set({
      docs: (await d.getAll("docs")).sort((a, b) =>
        b.created.localeCompare(a.created),
      ),
      categories: (await d.getAll("categories")).sort((a, b) => {
        const order = [
          "rg",
          "cpf",
          "cnh",
          "contratos",
          "comprovantes",
          "outros",
        ];
        const ai = order.indexOf(a.id),
          bi = order.indexOf(b.id);
        return (
          (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi) ||
          a.name.localeCompare(b.name)
        );
      }),
      theme: (await d.get("settings", "theme")) || "system",
      ready: true,
    });
  },
  setTheme: async (theme) => {
    await (await db()).put("settings", theme, "theme");
    set({ theme });
  },
}));
