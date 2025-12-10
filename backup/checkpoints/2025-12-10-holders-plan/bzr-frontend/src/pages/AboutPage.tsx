import React, { useMemo } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useAppConfig } from "../context/ConfigContext";
import aboutContent from "../content/About.txt?raw";

type AccordionItem = {
  title: string;
  body: string;
};

const parseAboutText = (raw: string): AccordionItem[] => {
  const lines = raw.split(/\r?\n/).map((l) => l.trim());
  const items: AccordionItem[] = [];
  let current: AccordionItem | null = null;

  lines.forEach((line) => {
    if (!line) return;
    const isHeader = /^[A-Z].*[\?]?$/.test(line) && line.length < 120;
    if (isHeader) {
      if (current) items.push(current);
      current = { title: line, body: "" };
    } else {
      if (!current) {
        current = { title: "About", body: line };
      } else {
        current.body += (current.body ? "\n\n" : "") + line;
      }
    }
  });
  if (current) items.push(current);
  return items;
};

const AboutAccordion: React.FC<{ items: AccordionItem[] }> = ({ items }) => {
  const [openIndex, setOpenIndex] = React.useState(0);

  return (
    <div className="space-y-3">
      {items.map((item, idx) => {
        const isOpen = idx === openIndex;
        return (
          <div key={idx} className="border border-gray-200 rounded-xl bg-white shadow-sm">
            <button
              onClick={() => setOpenIndex(isOpen ? -1 : idx)}
              className="w-full flex items-center justify-between px-4 py-3 text-left text-gray-900 font-semibold"
            >
              <span>{item.title}</span>
              {isOpen ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
            </button>
            {isOpen && (
              <div className="px-4 pb-4 text-sm text-gray-700 whitespace-pre-line leading-6">
                {item.body}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export const AboutPage: React.FC = () => {
  const { config } = useAppConfig();
  const items = useMemo(() => parseAboutText(aboutContent).filter((item) => item.title.toLowerCase() !== "about bazaars"), []);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6 text-left">
      <div className="flex flex-wrap items-center gap-3 scroll-mt-24" id="about-title">
        <img src={config.logoUrl} alt="BZR" className="h-12 w-auto" />
        <div className="h-8 w-px bg-gray-200" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">About BZR</h1>
          <p className="text-sm text-gray-600">
            Learn about Bazaars (BZR): who we are, the token, security, and how the marketplace works.
          </p>
        </div>
      </div>

      <AboutAccordion items={items} />
    </div>
  );
};
