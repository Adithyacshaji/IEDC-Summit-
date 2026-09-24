import { Building2, Map, X, MapPin, Layers } from "lucide-react";

/**
 * DestinationInfoCard
 *
 * Shown in DEMO_MODE after the user searches for a destination.
 * Displays info about the destination (building, floor, room) and
 * a "View Indoor Location" button that switches to the floor plan
 * with just a destination pin — no route drawn.
 *
 * Props:
 *   destination  – the selected search item (name, building, floor, id, …)
 *   onViewIndoor – callback: switch the map to indoor view with pin only
 *   onClose      – callback: dismiss without action
 */
function DestinationInfoCard({ destination, onViewIndoor, onClose }) {
  if (!destination) return null;

  const buildingRaw = (destination.building || "").toLowerCase();
  const isChavara = buildingRaw.includes("chavara");
  const buildingName = isChavara ? "St Chavara Block" : "St Mary's Block";
  const accentColor = isChavara ? "#7c3aed" : "#2563eb";
  const accentBg = isChavara ? "#ede9fe" : "#dbeafe";

  // Floor label
  const rawFloor = destination.floor ? String(destination.floor).toUpperCase() : null;
  let floorLabel = null;
  if (rawFloor) {
    if (rawFloor === "G" || rawFloor === "GROUND") floorLabel = "Ground Floor";
    else if (rawFloor === "B1") floorLabel = "Basement 1 (B1)";
    else if (rawFloor === "B2") floorLabel = "Basement 2 (B2)";
    else {
      const n = parseInt(rawFloor, 10);
      if (!isNaN(n)) {
        const suffix = n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th";
        floorLabel = `${n}${suffix} Floor`;
      } else {
        floorLabel = `Floor ${rawFloor}`;
      }
    }
  }

  // Room number / node ID
  const roomId = destination.indoorNode || destination.id || null;
  const isRoom = destination.type === "room";
  const isFaculty = destination.type === "faculty";

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(15,23,42,0.4)",
          zIndex: 2100,
          backdropFilter: "blur(3px)",
          WebkitBackdropFilter: "blur(3px)",
          animation: "fadeInBackdrop 0.2s ease",
        }}
      />

      {/* Card */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 2200,
          background: "#ffffff",
          borderRadius: "24px 24px 0 0",
          boxShadow: "0 -12px 48px rgba(0,0,0,0.18), 0 -2px 8px rgba(0,0,0,0.06)",
          padding: "0 0 calc(24px + env(safe-area-inset-bottom, 0px))",
          fontFamily: "'Inter', 'Segoe UI', sans-serif",
          animation: "slideUpCard 0.3s cubic-bezier(0.32,0.72,0,1)",
          overflow: "hidden",
        }}
      >
        {/* Coloured top accent bar */}
        <div
          style={{
            height: 4,
            background: `linear-gradient(90deg, ${accentColor}, ${isChavara ? "#a78bfa" : "#60a5fa"})`,
            borderRadius: "24px 24px 0 0",
          }}
        />

        <div style={{ padding: "16px 24px 0" }}>
          {/* Drag handle */}
          <div
            style={{
              width: 36,
              height: 4,
              background: "#e2e8f0",
              borderRadius: 9999,
              margin: "0 auto 18px",
            }}
          />

          {/* Close button */}
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              position: "absolute",
              top: 22,
              right: 20,
              background: "#f1f5f9",
              border: "none",
              borderRadius: "50%",
              width: 34,
              height: 34,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#64748b",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#e2e8f0")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#f1f5f9")}
          >
            <X size={16} />
          </button>

          {/* ── Destination heading ── */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 18 }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 16,
                background: accentBg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                boxShadow: `0 4px 12px ${accentColor}22`,
              }}
            >
              <Building2 size={26} color={accentColor} strokeWidth={2} />
            </div>
            <div style={{ paddingTop: 2 }}>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 800,
                  color: "#0f172a",
                  lineHeight: 1.25,
                  letterSpacing: "-0.01em",
                }}
              >
                {destination.name}
              </div>
              {isFaculty && destination.designation && (
                <div style={{ fontSize: 13, color: "#64748b", marginTop: 3 }}>
                  {destination.designation}
                </div>
              )}
            </div>
          </div>

          {/* ── Info pills ── */}
          <div
            style={{
              background: "#f8fafc",
              borderRadius: 16,
              border: "1px solid #e2e8f0",
              padding: "14px 16px",
              marginBottom: 16,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            {/* Building row */}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  background: accentBg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Building2 size={16} color={accentColor} strokeWidth={2} />
              </div>
              <div>
                <div style={{ fontSize: 10.5, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em" }}>
                  Building
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#1e293b" }}>
                  {buildingName}
                </div>
              </div>
            </div>

            {/* Floor row */}
            {floorLabel && (
              <>
                <div style={{ height: 1, background: "#e2e8f0" }} />
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 10,
                      background: "#f0fdf4",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Layers size={16} color="#16a34a" strokeWidth={2} />
                  </div>
                  <div>
                    <div style={{ fontSize: 10.5, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em" }}>
                      Floor
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#1e293b" }}>
                      {floorLabel}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Room number row */}
            {isRoom && roomId && (
              <>
                <div style={{ height: 1, background: "#e2e8f0" }} />
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 10,
                      background: "#fff7ed",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <MapPin size={16} color="#ea580c" strokeWidth={2} />
                  </div>
                  <div>
                    <div style={{ fontSize: 10.5, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em" }}>
                      Room
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#1e293b" }}>
                      {roomId}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* ── Action buttons ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button
              id="view-indoor-btn"
              onClick={onViewIndoor}
              style={{
                width: "100%",
                padding: "15px 0",
                borderRadius: 16,
                border: "none",
                background: `linear-gradient(135deg, ${accentColor}, ${isChavara ? "#a78bfa" : "#3b82f6"})`,
                color: "#fff",
                fontSize: 15,
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 9,
                boxShadow: `0 4px 16px ${accentColor}44`,
                transition: "transform 0.15s, box-shadow 0.15s",
                letterSpacing: "0.01em",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.02)";
                e.currentTarget.style.boxShadow = `0 8px 24px ${accentColor}55`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.boxShadow = `0 4px 16px ${accentColor}44`;
              }}
            >
              <Map size={18} />
              View Indoor Location
            </button>

            <button
              onClick={onClose}
              style={{
                width: "100%",
                padding: "14px 0",
                borderRadius: 16,
                border: "1.5px solid #e2e8f0",
                background: "#fff",
                color: "#475569",
                fontSize: 15,
                fontWeight: 600,
                cursor: "pointer",
                transition: "background 0.15s, border-color 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#f8fafc";
                e.currentTarget.style.borderColor = "#cbd5e1";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#fff";
                e.currentTarget.style.borderColor = "#e2e8f0";
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideUpCard {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes fadeInBackdrop {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>
    </>
  );
}

export default DestinationInfoCard;
