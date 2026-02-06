export default async function ProductPage({ params }) {
  const { slug } = await params; // <-- THIS is the fix for your error

  if (!slug) {
    return <pre style={{ padding: 24 }}>Slug missing</pre>;
  }

  const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

  const res = await fetch(`${base}/products/${slug}`, { cache: "no-store" });

  if (!res.ok) {
    return <pre style={{ padding: 24 }}>No product found</pre>;
  }

  const { product, offers } = await res.json();

  return (
    <main style={{ padding: 24 }}>
       <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
        <img
          src={product.image_url}
          alt={product.name}
          style={{
            width: 140,
            height: 140,
            objectFit: "contain",
            borderRadius: 12,
            background: "#111"
          }}
        />
        <div>
          <h1 style={{ margin: 0 }}>{product.name}</h1>
          <p style={{ margin: "6px 0 0", opacity: 0.8 }}>
            Category: {product.category} • {offers.length} offers
          </p>
        </div>
      </div>

      <div style={{ marginTop: 18, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid #333" }}>
              <th style={{ padding: 10 }}>Rank</th>
              <th style={{ padding: 10 }}>Seller</th>
              <th style={{ padding: 10 }}>Authorised</th>
              <th style={{ padding: 10 }}>Score</th>
              <th style={{ padding: 10 }}>Price</th>
              <th style={{ padding: 10 }}>Warranty</th>
              <th style={{ padding: 10 }}>Return</th>
              <th style={{ padding: 10 }}>Buy</th>
            </tr>
          </thead>
          <tbody>
            {offers.map((o, i) => (
              <tr key={o.id} style={{ borderBottom: "1px solid #222" }}>
                <td style={{ padding: 10 }}>{i + 1}</td>
                <td style={{ padding: 10, fontWeight: 600 }}>{o.seller_name}</td>
                <td style={{ padding: 10 }}>
                  {o.is_authorised ? "✅ Yes" : "⚠️ No"}
                </td>
                <td style={{ padding: 10 }}>{o.seller_score}</td>
                <td style={{ padding: 10, fontWeight: 700 }}>
                  ₹{o.price_inr.toLocaleString("en-IN")}
                </td>
                <td style={{ padding: 10 }}>{o.warranty_type}</td>
                <td style={{ padding: 10 }}>{o.return_days} days</td>
                <td style={{ padding: 10 }}>
                  <a
                    href={o.product_url}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: "inline-block",
                      padding: "8px 12px",
                      borderRadius: 10,
                      background: "#25eb56",
                      color: "white",
                      textDecoration: "none",
                      fontWeight: 700
                    }}
                  >
                    Buy Now →
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </main>
  );
}
