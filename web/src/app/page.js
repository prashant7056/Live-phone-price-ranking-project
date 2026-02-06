export const dynamic = "force-dynamic";

async function getProducts() {
  const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
  const res = await fetch(`${base}/products`, { cache: "no-store" });

  if (!res.ok) {
    throw new Error(`Failed to fetch products: ${res.status}`);
  }
  return res.json();
}

export default async function Home() {
  const products = await getProducts();

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: 24, fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: 28, marginBottom: 6 }}>Apple Compare (India)</h1>
      <p style={{ marginTop: 0, color: "#666" }}>
        Trusted sellers ranked by price & seller score.
      </p>

      {products.length === 0 ? (
        <div style={{ marginTop: 20, padding: 16, border: "1px solid #ddd", borderRadius: 10 }}>
          No products yet. Add products from Postman using <code>/admin/products</code>.
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            gap: 16,
            marginTop: 20,
          }}
        >
          {products.map((p) => (
            <a
              key={p.id}
              href={`/products/${p.slug}`}
              style={{
                textDecoration: "none",
                color: "inherit",
                border: "1px solid #e5e5e5",
                borderRadius: 14,
                padding: 14,
                display: "block",
              }}
            >
              <div
                style={{
                  height: 170,
                  borderRadius: 12,
                  background: "#f6f6f6",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  marginBottom: 10,
                }}
              >
                <img
                  src={p.image_url}
                  alt={p.name}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>

              <div style={{ fontWeight: 700, fontSize: 16 }}>{p.name}</div>
              <div style={{ color: "#666", fontSize: 13, marginTop: 4 }}>
                Category: {p.category}
              </div>
              <div style={{ marginTop: 10, color: "#111", fontWeight: 600 }}>
                View offers →
              </div>
            </a>
          ))}
        </div>
      )}
    </main>
  );
}
