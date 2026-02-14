export default function Header() {
  return (
    <header
      style={{
        padding: '16px 24px',
        borderBottom: '1px solid #ddd',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <strong>POST THIS</strong>
      <span style={{ fontSize: '14px', color: '#666' }}>
        core webtool
      </span>
    </header>
  )
}
