import { Building2, Map, X, Navigation } from "lucide-react";

/**
 * OutsideCampusModal
 *
 * Shown when the user's GPS location is outside the campus boundary and they
 * search for an indoor location (room / faculty). It summarises the destination
 * and offers to preview the floor plan.
 *
 * Props:
 *   destination  – the selected search item (type, name, building, floor, …)
 *   onViewIndoor – callback: switch the map to indoor preview
 *   onClose      – callback: dismiss the modal without doing anything
 */
function OutsideCampusModal({ destination, onViewIndoor, onClose }) {
  if (!destination) return null;

  const buildingRaw = (destination.building || "").toLowerCase();
  const isChavara = buildingRaw.includes("chavara");
  const buildingName = isChavara ? "St Chavara Block" : "St Mary's Block";

  const floor = destination.floor ? String(destination.floor).toUpperCase() : null;
  const floorLabel = floor
    ? floor === "G"
      ? "Ground Floor"
      : `Floor ${floor}`
    : null;

  const isRoom = destination.type === "room";
  const isFaculty = destination.type === "faculty";

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.35)",
          zIndex: 2100,
          backdropFilter: "blur(2px)",
        }}
        onClick={onClose}
      />

      {/* Card */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 2200,
          background: "#fff",
          borderRadius: "24px 24px 0 0",
          boxShadow: "0 -8px 40px rgba(0,0,0,0.18)",
          padding: "28px 24px calc(28px + env(safe-area-inset-bottom, 0px))",
          fontFamily: "'Inter', sans-serif",
          animation: "slideUp 0.28s cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        {/* Handle */}
        <div
          style={{
            width: 40,
            height: 4,
            background: "#e5e7eb",
            borderRadius: 9999,
            margin: "0 auto 20px",
          }}
        />

        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: 20,
            right: 20,
            background: "#f3f4f6",
            border: "none",
            borderRadius: "50%",
            width: 32,
            height: 32,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#6b7280",
          }}
          aria-label="Close"
        >
          <X size={16} />
        </button>

        {/* Icon + heading */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
          <div
            style={{
              width: 50,
              height: 50,
              borderRadius: 14,
              background: isChavara ? "#ede9fe" : "#dbeafe",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Building2
              size={24}
              color={isChavara ? "#7c3aed" : "#2563eb"}
              strokeWidth={2}
            />
          </div>
          <div>
            <div
              style={{
                fontSize: 17,
                fontWeight: 700,
                color: "#111827",
                lineHeight: 1.25,
              }}
            >
              {destination.name}
            </div>
            <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>
              {isFaculty && destination.designation
                ? `${destination.designation} · `
                : ""}
              {buildingName}
              {floorLabel ? ` · ${floorLabel}` : ""}
            </div>
          </div>
        </div>

        {/* Info message */}
        <div
          style={{
            background: "#f9fafb",
            borderRadius: 12,
            padding: "12px 16px",
            marginBottom: 20,
            display: "flex",
            gap: 10,
            alignItems: "flex-start",
          }}
        >
          <Navigation size={16} color="#3b82f6" style={{ marginTop: 2, flexShrink: 0 }} />
          <p style={{ margin: 0, fontSize: 13.5, color: "#374151", lineHeight: 1.5 }}>
            You&rsquo;re currently <strong>outside the campus</strong>. Route
            guidance isn&rsquo;t available yet, but you can preview the indoor
            floor map to see exactly where{" "}
            <strong>{destination.name}</strong> is located.
          </p>
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button
            onClick={onViewIndoor}
            style={{
              width: "100%",
              padding: "14px 0",
              borderRadius: 14,
              border: "none",
              background: "linear-gradient(135deg,#2563eb,#3b82f6)",
              color: "#fff",
              fontSize: 15,
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              boxShadow: "0 4px 14px rgba(37,99,235,0.35)",
              transition: "transform 0.15s, box-shadow 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "scale(1.02)";
              e.currentTarget.style.boxShadow = "0 6px 20px rgba(37,99,235,0.45)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)";
              e.currentTarget.style.boxShadow = "0 4px 14px rgba(37,99,235,0.35)";
            }}
          >
            <Map size={18} />
            View Indoor Location
          </button>

          <button
            onClick={onClose}
            style={{
              width: "100%",
              padding: "13px 0",
              borderRadius: 14,
              border: "1.5px solid #e5e7eb",
              background: "#fff",
              color: "#374151",
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#f9fafb")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
          >
            Cancel
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
    </>
  );
}

export default OutsideCampusModal;
