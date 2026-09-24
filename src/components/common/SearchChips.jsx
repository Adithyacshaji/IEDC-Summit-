import React from "react";
import { Wrench, Users, Sparkles, Rocket, Trophy, Award, Music } from "lucide-react";

const CATEGORIES = [
  { id: "Workshops and Clinics", label: "Workshops & Clinics", icon: Wrench },
  { id: "Panel Discussions and Fireside Chats", label: "Panel Discussions & Chats", icon: Users },
  { id: "Activity hub", label: "Activity Hub", icon: Sparkles },
  { id: "Startup exhibitions", label: "Startup Exhibitions", icon: Rocket },
  { id: "Hackathons and Quiz", label: "Hackathons & Quiz", icon: Trophy },
  { id: "Formal Function", label: "Formal Functions", icon: Award },
  { id: "Proshow", label: "Pro Show", icon: Music },
];

function SearchChips({ onSelectCategory, activeCategory = "Workshops and Clinics" }) {
  return (
    <div className="w-full mx-auto overflow-x-auto custom-scrollbar pointer-events-auto mt-3 pb-2 -mb-2 hide-scrollbar">
      <div className="flex items-center gap-3 px-4 pb-2">
        {CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat.id;
          const Icon = cat.icon;
          return (
            <button
              key={cat.id}
              onClick={() => onSelectCategory?.(cat.id)}
              className={'flex items-center gap-2 shrink-0 px-4 py-2 rounded-full text-[14px] font-medium transition-all duration-200 border whitespace-nowrap cursor-pointer ' + 
                (isActive 
                  ? 'bg-blue-600 border-blue-600 text-white shadow-md font-semibold' 
                  : 'bg-white border-gray-200 text-gray-800 hover:bg-gray-50 shadow-sm'
                )
              }
            >
              <Icon size={16} strokeWidth={isActive ? 2.5 : 2} />
              {cat.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default SearchChips;
