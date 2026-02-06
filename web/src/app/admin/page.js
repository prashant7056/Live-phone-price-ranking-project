"use client";

import { useEffect, useMemo, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:4000";

export default function AdminPage() {
  const [products, setProducts] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [offers, setOffers] = useState([]);

  const [token, setToken] = useState("");
  const [msg, setMsg] = useState("");

  // add/update form
  const [form, setForm] = useState({
    product_id: "",
    seller_id: "",
    price_inr: "",
    warranty_type: "Apple",
    return_days: 7,
    product_url: "",
  });

  // edit modal-ish state
  const [editing, setEditing] = useState(null); // offer row or null
  const [editForm, setEditForm] = useState({
    id: "",
    price_inr: "",
    warranty_type: "",
    return_days: 0,
    product_url: "",
  });

  useEffect(() => {
    fetch(`${API}/products`).then((r) => r.json()).then(setProducts);
    fetch(`${API}/sellers`).then((r) => r.json()).then(setSellers);
  }, []);

  const tokenOk = useMemo(() => token && token.trim().startsWith("ey"), [token]);

  function updateField(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function loadOffers() {
    setMsg("");
    if (!tokenOk) {
      setMsg("Paste a valid token first, then click Load Offers.");
      return;
    }

    const res = await fetch(`${API}/admin/offers`, {
      headers: { Authorization: `Bearer ${token.trim()}` },
      cache: "no-store",
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMsg(`Failed to load offers: ${data?.error || res.status}`);
      return;
    }
    setOffers(Array.isArray(data) ? data : []);
    setMsg("Offers loaded.");
  }

  async function submit(e) {
    e.preventDefault();
    setMsg("");

    if (!tokenOk) {
      setMsg("Paste token first.");
      return;
    }

    const payload = {
      product_id: Number(form.product_id),
      seller_id: Number(form.seller_id),
      price_inr: Number(form.price_inr),
      warranty_type: String(form.warranty_type || "").trim(),
      return_days: Number(form.return_days),
      product_url: String(form.product_url || "").trim(),
    };

    if (!payload.product_id || !payload.seller_id || !payload.price_inr || !payload.product_url) {
      setMsg("Fill Product, Seller, Price, URL.");
      return;
    }

    const res = await fetch(`${API}/admin/offers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token.trim()}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMsg(`Failed: ${data?.error || res.status}`);
      return;
    }

    setMsg("Saved. Reload offers to see changes in the table.");
  }

  function startEdit(row) {
    setEditing(row);
    setEditForm({
      id: row.id,
      price_inr: row.price_inr,
      warranty_type: row.warranty_type,
      return_days: row.return_days,
      product_url: row.product_url,
    });
    setMsg("");
  }

  function updateEditField(e) {
    setEditForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function saveEdit() {
    setMsg("");
    if (!editing) return;
    if (!tokenOk) {
      setMsg("Paste token first.");
      return;
    }

    const id = Number(editForm.id);
    const payload = {
      price_inr: Number(editForm.price_inr),
      warranty_type: String(editForm.warranty_type || "").trim(),
      return_days: Number(editForm.return_days),
      product_url: String(editForm.product_url || "").trim(),
    };

    if (!id || !payload.price_inr || !payload.warranty_type || !payload.product_url) {
      setMsg("Edit requires price, warranty, url.");
      return;
    }

    const res = await fetch(`${API}/admin/offers/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token.trim()}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMsg(`Edit failed: ${data?.error || res.status}`);
      return;
    }

    setMsg("Edited. Reload offers to see updates.");
    setEditing(null);
  }

  async function deleteOffer(id) {
    setMsg("");
    if (!tokenOk) {
      setMsg("Paste token first.");
      return;
    }

    const res = await fetch(`${API}/admin/offers/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token.trim()}` },
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMsg(`Delete failed: ${data?.error || res.status}`);
      return;
    }

    setMsg("Deleted. Reload offers to refresh table.");
  }

  return (
    <main style={{ padding: 24, maxWidth: 1000 }}>
      <h1 style={{ marginBottom: 6 }}>Admin – Offers</h1>
      <p style={{ marginTop: 0, opacity: 0.8 }}>
        Paste token → Load Offers → Edit/Delete. Add/Update uses Product+Seller unique pair.
      </p>

      <div style={{ display: "grid", gap: 8, marginBottom: 18 }}>
        <label>
          Admin Token
          <input
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="eyJhbGciOiJIUzI1NiIs..."
            style={{ width: "100%" }}
          />
        </label>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button type="button" onClick={loadOffers} style={{ padding: "10px 14px", fontWeight: 700 }}>
            Load Offers
          </button>
        </div>

        {msg ? <p style={{ margin: 0 }}>{msg}</p> : null}
      </div>

      <hr style={{ margin: "18px 0" }} />

      <h2 style={{ marginBottom: 8 }}>Add / Update Offer</h2>

      <form onSubmit={submit} style={{ display: "grid", gap: 12, maxWidth: 720 }}>
        <label>
          Product
          <select name="product_id" value={form.product_id} onChange={updateField} required>
            <option value="">Select product</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} (#{p.id})
              </option>
            ))}
          </select>
        </label>

        <label>
          Seller
          <select name="seller_id" value={form.seller_id} onChange={updateField} required>
            <option value="">Select seller</option>
            {sellers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} (#{s.id})
              </option>
            ))}
          </select>
        </label>

        <label>
          Price (INR)
          <input
            name="price_inr"
            type="number"
            placeholder="e.g. 78999"
            value={form.price_inr}
            onChange={updateField}
            required
          />
        </label>

        <label>
          Product URL
          <input
            name="product_url"
            placeholder="https://..."
            value={form.product_url}
            onChange={updateField}
            required
          />
        </label>

        <label>
          Warranty
          <input name="warranty_type" value={form.warranty_type} onChange={updateField} />
        </label>

        <label>
          Return days
          <input name="return_days" type="number" value={form.return_days} onChange={updateField} />
        </label>

        <button type="submit" style={{ padding: "10px 14px", fontWeight: 700 }}>
          Save Offer
        </button>
      </form>

      <hr style={{ margin: "18px 0" }} />

      <h2 style={{ marginBottom: 8 }}>Existing Offers</h2>
      <p style={{ marginTop: 0, opacity: 0.8 }}>
        Click Edit to change price/url/warranty/return days. Click Delete to remove an offer.
      </p>

      <div style={{ overflowX: "auto" }}>
        <table border="1" cellPadding="8" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Product</th>
              <th>Seller</th>
              <th>Price</th>
              <th>Warranty</th>
              <th>Return</th>
              <th>Link</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {offers.map((o) => (
              <tr key={o.id}>
                <td>{o.id}</td>
                <td>{o.product_name} ({o.product_slug})</td>
                <td>{o.seller_name}</td>
                <td>₹{Number(o.price_inr).toLocaleString("en-IN")}</td>
                <td>{o.warranty_type}</td>
                <td>{o.return_days}d</td>
                <td>
                  <a href={o.product_url} target="_blank" rel="noreferrer">
                    Open
                  </a>
                </td>
                <td style={{ whiteSpace: "nowrap" }}>
                  <button type="button" onClick={() => startEdit(o)}>
                    Edit
                  </button>{" "}
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Delete offer #${o.id}?`)) deleteOffer(o.id);
                    }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}

            {offers.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: "center", padding: 16 }}>
                  No offers loaded. Paste token and click “Load Offers”.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {editing ? (
        <div style={{ marginTop: 18, padding: 12, border: "1px solid #ccc" }}>
          <h3 style={{ marginTop: 0 }}>Edit Offer #{editing.id}</h3>

          <div style={{ display: "grid", gap: 10, maxWidth: 720 }}>
            <label>
              Price (INR)
              <input name="price_inr" type="number" value={editForm.price_inr} onChange={updateEditField} />
            </label>

            <label>
              Product URL
              <input name="product_url" value={editForm.product_url} onChange={updateEditField} />
            </label>

            <label>
              Warranty
              <input name="warranty_type" value={editForm.warranty_type} onChange={updateEditField} />
            </label>

            <label>
              Return days
              <input name="return_days" type="number" value={editForm.return_days} onChange={updateEditField} />
            </label>

            <div style={{ display: "flex", gap: 10 }}>
              <button type="button" onClick={saveEdit} style={{ fontWeight: 700 }}>
                Save Edit
              </button>
              <button type="button" onClick={() => setEditing(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
