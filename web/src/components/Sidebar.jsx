export default function Sidebar({ activePage, onSelectPage }) {
  const items = [
    "Dashboard",
    "Posts",
    "Kanalen",
    "Planning",
    "Instellingen",
  ];

  return (
    <aside
      style={{
        width: "220px",
        borderRight: "1px solid #ddd",
        padding: "16px",
      }}
    >
      <nav>
        {items.map((item) => (
          <div
            key={item}
            onClick={() => onSelectPage(item)}
            style={{
              cursor: "pointer",
              marginBottom: "12px",
              fontWeight: activePage === item ? "bold" : "normal",
            }}
          >
            {item}
          </div>
        ))}
      </nav>
    </aside>
  );
}
