import React, { useState } from "react";
import { GripVertical, Link2 } from "lucide-react";

export const FooterMenusEditor: React.FC<{
  menus: { title: string; links: { label: string; url: string }[] }[];
  onChange: (menus: { title: string; links: { label: string; url: string }[] }[]) => void;
}> = ({ menus, onChange }) => {
  const [dragMenuIndex, setDragMenuIndex] = useState<number | null>(null);
  const [dragOverMenuIndex, setDragOverMenuIndex] = useState<number | null>(null);
  const [dragLink, setDragLink] = useState<{ menuIndex: number; linkIndex: number } | null>(null);
  const [dragOverLink, setDragOverLink] = useState<{ menuIndex: number; linkIndex: number } | null>(
    null
  );

  const updateMenuTitle = (index: number, value: string) => {
    const next = [...menus];
    next[index] = { ...next[index], title: value };
    onChange(next);
  };

  const updateMenuLink = (
    menuIndex: number,
    linkIndex: number,
    key: "label" | "url",
    value: string
  ) => {
    const next = [...menus];
    const links = [...(next[menuIndex]?.links || [])];
    links[linkIndex] = { ...links[linkIndex], [key]: value };
    next[menuIndex] = { ...next[menuIndex], links };
    onChange(next);
  };

  const addMenu = () =>
    onChange([...menus, { title: "New Section", links: [{ label: "", url: "" }] }]);
  const removeMenu = (index: number) => onChange(menus.filter((_, i) => i !== index));

  const addLink = (menuIndex: number) => {
    const next = [...menus];
    const links = [...(next[menuIndex]?.links || [])];
    links.push({ label: "", url: "" });
    next[menuIndex] = { ...next[menuIndex], links };
    onChange(next);
  };

  const removeLink = (menuIndex: number, linkIndex: number) => {
    const next = [...menus];
    const links = [...(next[menuIndex]?.links || [])].filter((_, i) => i !== linkIndex);
    next[menuIndex] = { ...next[menuIndex], links };
    onChange(next);
  };

  const moveMenu = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= menus.length) return;
    const next = [...menus];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    onChange(next);
  };

  const reorderMenu = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    const next = [...menus];
    const [item] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, item);
    onChange(next);
  };

  const moveLink = (menuIndex: number, linkIndex: number, direction: -1 | 1) => {
    const links = menus[menuIndex]?.links || [];
    const target = linkIndex + direction;
    if (target < 0 || target >= links.length) return;
    const next = [...menus];
    const newLinks = [...links];
    const [item] = newLinks.splice(linkIndex, 1);
    newLinks.splice(target, 0, item);
    next[menuIndex] = { ...next[menuIndex], links: newLinks };
    onChange(next);
  };

  const reorderLink = (menuIndex: number, fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    const next = [...menus];
    const links = [...(next[menuIndex]?.links || [])];
    const [item] = links.splice(fromIndex, 1);
    links.splice(toIndex, 0, item);
    next[menuIndex] = { ...next[menuIndex], links };
    onChange(next);
  };

  return (
    <div className="space-y-4">
      {menus.map((menu, menuIndex) => (
        <div
          key={menuIndex}
          className={`border border-gray-200 rounded-lg p-3 space-y-3 ${
            dragOverMenuIndex === menuIndex ? "ring-2 ring-blue-200" : ""
          }`}
          onDragOver={(e) => {
            if (dragMenuIndex === null) return;
            e.preventDefault();
            setDragOverMenuIndex(menuIndex);
          }}
          onDragLeave={() => setDragOverMenuIndex(null)}
          onDrop={() => {
            if (dragMenuIndex === null) return;
            reorderMenu(dragMenuIndex, menuIndex);
            setDragMenuIndex(null);
            setDragOverMenuIndex(null);
          }}
        >
          <div className="flex items-center gap-2">
            <button
              type="button"
              draggable
              onDragStart={() => setDragMenuIndex(menuIndex)}
              onDragEnd={() => {
                setDragMenuIndex(null);
                setDragOverMenuIndex(null);
              }}
              className="cursor-grab text-gray-400 hover:text-gray-600 px-1"
              aria-label="Drag to reorder section"
              title="Drag to reorder section"
            >
              <GripVertical className="w-4 h-4" />
            </button>
            <input
              className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-semibold"
              value={menu.title}
              onChange={(e) => updateMenuTitle(menuIndex, e.target.value)}
            />
            <button
              type="button"
              onClick={() => removeMenu(menuIndex)}
              className="px-3 py-2 bg-red-50 text-red-600 border border-red-100 rounded-lg text-xs hover:bg-red-100"
            >
              Remove section
            </button>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => moveMenu(menuIndex, -1)}
                className="px-2 py-2 bg-gray-50 text-gray-700 border border-gray-200 rounded-lg text-xs hover:bg-gray-100"
                aria-label="Move section up"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => moveMenu(menuIndex, 1)}
                className="px-2 py-2 bg-gray-50 text-gray-700 border border-gray-200 rounded-lg text-xs hover:bg-gray-100"
                aria-label="Move section down"
              >
                ↓
              </button>
            </div>
          </div>
          <div className="space-y-2">
            {menu.links.map((link, linkIndex) => (
              <div
                key={`${menuIndex}-${linkIndex}`}
                className={`grid grid-cols-1 md:grid-cols-2 gap-2 ${
                  dragOverLink &&
                  dragOverLink.menuIndex === menuIndex &&
                  dragOverLink.linkIndex === linkIndex
                    ? "ring-2 ring-blue-100 rounded-lg p-2 -m-2"
                    : ""
                }`}
                onDragOver={(e) => {
                  if (!dragLink || dragLink.menuIndex !== menuIndex) return;
                  e.preventDefault();
                  setDragOverLink({ menuIndex, linkIndex });
                }}
                onDragLeave={() => setDragOverLink(null)}
                onDrop={() => {
                  if (!dragLink || dragLink.menuIndex !== menuIndex) return;
                  reorderLink(menuIndex, dragLink.linkIndex, linkIndex);
                  setDragLink(null);
                  setDragOverLink(null);
                }}
              >
                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  placeholder="Link label (e.g., CoinMarketCap)"
                  value={link.label}
                  onChange={(e) =>
                    updateMenuLink(menuIndex, linkIndex, "label", e.target.value)
                  }
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    draggable
                    onDragStart={() => setDragLink({ menuIndex, linkIndex })}
                    onDragEnd={() => {
                      setDragLink(null);
                      setDragOverLink(null);
                    }}
                    className="cursor-grab text-gray-400 hover:text-gray-600 px-1"
                    aria-label="Drag to reorder link"
                    title="Drag to reorder link"
                  >
                    <GripVertical className="w-4 h-4" />
                  </button>
                  <input
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    placeholder="https://"
                    value={link.url}
                    onChange={(e) =>
                      updateMenuLink(menuIndex, linkIndex, "url", e.target.value)
                    }
                  />
                  <button
                    type="button"
                    onClick={() => removeLink(menuIndex, linkIndex)}
                    className="px-3 py-2 bg-red-50 text-red-600 border border-red-100 rounded-lg text-xs hover:bg-red-100"
                  >
                    Remove
                  </button>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => moveLink(menuIndex, linkIndex, -1)}
                      className="px-2 py-2 bg-gray-50 text-gray-700 border border-gray-200 rounded-lg text-xs hover:bg-gray-100"
                      aria-label="Move link up"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => moveLink(menuIndex, linkIndex, 1)}
                      className="px-2 py-2 bg-gray-50 text-gray-700 border border-gray-200 rounded-lg text-xs hover:bg-gray-100"
                      aria-label="Move link down"
                    >
                      ↓
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => addLink(menuIndex)}
            className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-2"
          >
            <Link2 className="w-4 h-4" /> Add link
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={addMenu}
        className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-2"
      >
        <Link2 className="w-4 h-4" /> Add section
      </button>
    </div>
  );
};
