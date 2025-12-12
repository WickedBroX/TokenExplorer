import React, { useState } from "react";
import { GripVertical, Link2, Globe, FileText, Send } from "lucide-react";
import {
  resolveSocialIconKey,
  SOCIAL_ICON_OPTIONS,
  type SocialIconKey,
} from "../../utils/social";
import XLogoIcon from "../icons/XLogoIcon";

const DiscordIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
  </svg>
);

const MediumIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M13.54 12a6.8 6.8 0 01-6.77 6.82A6.8 6.8 0 010 12a6.8 6.8 0 016.77-6.82A6.8 6.8 0 0113.54 12zM20.96 12c0 3.54-1.51 6.42-3.38 6.42-1.87 0-3.39-2.88-3.39-6.42s1.52-6.42 3.39-6.42 3.38 2.88 3.38 6.42M24 12c0 3.17-.53 5.75-1.19 5.75-.66 0-1.19-2.58-1.19-5.75s.53-5.75 1.19-5.75C23.47 6.25 24 8.83 24 12z" />
  </svg>
);

const FacebookIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

const InstagramIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
  </svg>
);

const SOCIAL_ICON_META: Record<
  SocialIconKey,
  { label: string; Icon: React.ComponentType<{ className?: string }>; bg: string }
> = {
  website: { label: "Website / Link", Icon: Globe, bg: "bg-blue-500" },
  whitepaper: { label: "Whitepaper / Docs", Icon: FileText, bg: "bg-gray-600" },
  x: { label: "X (Twitter)", Icon: XLogoIcon, bg: "bg-black" },
  telegram: { label: "Telegram", Icon: Send, bg: "bg-blue-500" },
  discord: { label: "Discord", Icon: DiscordIcon, bg: "bg-indigo-600" },
  medium: { label: "Medium", Icon: MediumIcon, bg: "bg-gray-700" },
  facebook: { label: "Facebook", Icon: FacebookIcon, bg: "bg-blue-700" },
  instagram: { label: "Instagram", Icon: InstagramIcon, bg: "bg-pink-500" },
};

export const SocialLinksEditor: React.FC<{
  links: { name: string; url: string; icon?: SocialIconKey }[];
  onChange: (links: { name: string; url: string; icon?: SocialIconKey }[]) => void;
  addLabel?: string;
  namePlaceholder?: string;
  urlPlaceholder?: string;
}> = ({
  links,
  onChange,
  addLabel = "Add link",
  namePlaceholder = "Name (e.g., X)",
  urlPlaceholder = "https://",
}) => {
  const [openIconIndex, setOpenIconIndex] = useState<number | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const updateLink = (index: number, key: "name" | "url" | "icon", value: string) => {
    const next = [...links];
    next[index] = { ...next[index], [key]: value };
    onChange(next);
  };

  const addLink = () => onChange([...links, { name: "", url: "", icon: "website" }]);
  const removeLink = (index: number) => onChange(links.filter((_, i) => i !== index));
  const reorderLink = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    const next = [...links];
    const [item] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, item);
    onChange(next);
  };
  const moveLink = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= links.length) return;
    const next = [...links];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    onChange(next);
  };

  return (
    <div className="space-y-4">
      {links.map((link, index) => (
        <div
          key={index}
          className={`space-y-2 ${index > 0 ? "pt-4 border-t border-gray-100" : ""} ${
            dragOverIndex === index ? "ring-2 ring-blue-200 rounded-lg p-2 -m-2" : ""
          }`}
          onDragOver={(e) => {
            if (dragIndex === null) return;
            e.preventDefault();
            setDragOverIndex(index);
          }}
          onDragLeave={() => setDragOverIndex(null)}
          onDrop={() => {
            if (dragIndex === null) return;
            reorderLink(dragIndex, index);
            setDragIndex(null);
            setDragOverIndex(null);
          }}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) {
              setOpenIconIndex(null);
            }
          }}
        >
          <div className="flex items-center gap-2">
            <button
              type="button"
              draggable
              onDragStart={() => setDragIndex(index)}
              onDragEnd={() => {
                setDragIndex(null);
                setDragOverIndex(null);
              }}
              className="cursor-grab text-gray-400 hover:text-gray-600 px-1"
              aria-label="Drag to reorder link"
              title="Drag to reorder"
            >
              <GripVertical className="w-4 h-4" />
            </button>
            <input
              className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              placeholder={namePlaceholder}
              value={link.name}
              onChange={(e) => updateLink(index, "name", e.target.value)}
            />
            <div className="relative">
              <button
                type="button"
                onClick={() => setOpenIconIndex(openIconIndex === index ? null : index)}
                className="h-10 w-10 flex items-center justify-center border border-gray-200 rounded-lg bg-white hover:border-blue-300 focus:ring-2 focus:ring-blue-500"
                aria-label={`Select icon for ${link.name || "link"}`}
              >
                {(() => {
                  const key = resolveSocialIconKey(link);
                  const meta = SOCIAL_ICON_META[key];
                  const Icon = meta.Icon;
                  return (
                    <span
                      className={`h-7 w-7 rounded-full flex items-center justify-center text-white ${meta.bg}`}
                    >
                      <Icon className="w-4 h-4" />
                    </span>
                  );
                })()}
              </button>
              {openIconIndex === index && (
                <div className="absolute z-20 mt-2 w-48 rounded-lg border border-gray-200 bg-white shadow-lg p-2 space-y-1">
                  {SOCIAL_ICON_OPTIONS.map((option) => {
                    const meta = SOCIAL_ICON_META[option.value];
                    const Icon = meta.Icon;
                    const isActive = resolveSocialIconKey(link) === option.value;
                    return (
                      <button
                        type="button"
                        key={option.value}
                        className={`w-full flex items-center gap-2 px-2 py-2 rounded-md text-left text-sm hover:bg-gray-50 ${
                          isActive ? "bg-blue-50 border border-blue-100" : ""
                        }`}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          updateLink(index, "icon", option.value);
                          setOpenIconIndex(null);
                        }}
                      >
                        <span
                          className={`h-7 w-7 rounded-full flex items-center justify-center text-white ${meta.bg}`}
                        >
                          <Icon className="w-4 h-4" />
                        </span>
                        <span className="text-xs font-medium text-gray-700">{meta.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <input
              className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              placeholder={urlPlaceholder}
              value={link.url}
              onChange={(e) => updateLink(index, "url", e.target.value)}
            />
            <button
              type="button"
              onClick={() => removeLink(index)}
              className="px-3 py-2 bg-red-50 text-red-600 border border-red-100 rounded-lg text-xs hover:bg-red-100"
            >
              Remove
            </button>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => moveLink(index, -1)}
                className="px-2 py-2 bg-gray-50 text-gray-700 border border-gray-200 rounded-lg text-xs hover:bg-gray-100"
                aria-label="Move link up"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => moveLink(index, 1)}
                className="px-2 py-2 bg-gray-50 text-gray-700 border border-gray-200 rounded-lg text-xs hover:bg-gray-100"
                aria-label="Move link down"
              >
                ↓
              </button>
            </div>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={addLink}
        className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-2"
      >
        <Link2 className="w-4 h-4" /> {addLabel}
      </button>
    </div>
  );
};
