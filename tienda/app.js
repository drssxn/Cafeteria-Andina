const C = window.CONFIG || {};
const $ = id => document.getElementById(id);
const db = supabase.createClient(C.SUPABASE_URL, C.SUPABASE_KEY);
const money = n => '$' + Number(n).toLocaleString('es-CO');
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let toastT;
function toast(m){const t=$('toast');t.textContent=m;t.classList.add('show');clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove('show'),3000)}
const opts = (rows, label) => rows.map(r => `<option value="${r.id}">${esc(label(r))}</option>`).join('');
let productos = [], editId = null;

// Pestañas
document.querySelectorAll('nav button').forEach(b => b.onclick = () => {
  document.querySelectorAll('nav button').forEach(x => x.classList.toggle('on', x === b));
  document.querySelectorAll('main section').forEach(s => s.hidden = s.id !== b.dataset.tab);
});

// Panel (Looker Studio)
$('dash').innerHTML = C.LOOKER_URL
  ? `<iframe src="${esc(C.LOOKER_URL)}" title="Panel de ventas" allowfullscreen sandbox="allow-storage-access-by-user-activation allow-scripts allow-same-origin allow-popups"></iframe>`
  : '<p class="empty">Falta la URL del informe de Looker Studio (LOOKER_URL en config.js).</p>';

async function cargarCatalogos(){
  const [c, p, cat] = await Promise.all([
    db.from('clientes').select('id,nombre').order('nombre'),
    db.from('productos').select('id,nombre,precio,stock,activo,categoria_id,categorias(nombre)').order('nombre'),
    db.from('categorias').select('id,nombre').order('nombre')
  ]);
  if (c.error || p.error || cat.error) return toast('Error: ' + (c.error || p.error || cat.error).message);
  productos = p.data;
  $('pCliente').innerHTML = opts(c.data, r => r.nombre);
  $('pProducto').innerHTML = opts(productos.filter(x => x.activo), r => `${r.nombre} (${money(r.precio)})`);
  $('prCategoria').innerHTML = opts(cat.data, r => r.nombre);
  renderProductos();
}

// Pedidos
async function cargarPedidos(){
  const { data, error } = await db.from('pedidos')
    .select('id,estado,canal,creado_en,clientes(nombre),detalle_pedidos(cantidad,precio_unitario,productos(nombre))')
    .order('creado_en', { ascending: false }).limit(50);
  if (error) return toast('Error: ' + error.message);
  const est = ['pendiente','preparando','entregado','cancelado'];
  $('tPedidos').innerHTML = '<tr><th>#</th><th>Fecha</th><th>Cliente</th><th>Productos</th><th>Total</th><th>Canal</th><th>Estado</th><th></th></tr>' +
    data.map(p => {
      const tot = p.detalle_pedidos.reduce((s, d) => s + d.cantidad * d.precio_unitario, 0);
      const items = p.detalle_pedidos.map(d => `${d.cantidad}× ${d.productos.nombre}`).join(', ');
      return `<tr><td>${p.id}</td><td>${new Date(p.creado_en).toLocaleDateString('es-CO')}</td><td>${esc(p.clientes.nombre)}</td><td>${esc(items)}</td><td>${money(tot)}</td><td>${p.canal}</td>
      <td><select data-estado="${p.id}">${est.map(e => `<option${e === p.estado ? ' selected' : ''}>${e}</option>`).join('')}</select></td>
      <td><button class="del" data-del="${p.id}">Eliminar</button></td></tr>`;
    }).join('');
}
$('tPedidos').onchange = async e => {
  const id = e.target.dataset.estado; if (!id) return;
  const { error } = await db.from('pedidos').update({ estado: e.target.value }).eq('id', id);
  toast(error ? 'Error: ' + error.message : 'Estado actualizado');
};
$('tPedidos').onclick = async e => {
  const id = e.target.dataset.del; if (!id || !confirm('¿Eliminar el pedido ' + id + '?')) return;
  const { error } = await db.from('pedidos').delete().eq('id', id);
  toast(error ? 'Error: ' + error.message : 'Pedido eliminado'); cargarPedidos();
};
$('fPedido').onsubmit = async e => {
  e.preventDefault();
  const prod = productos.find(x => x.id == $('pProducto').value), cant = +$('pCantidad').value;
  const { data: ped, error } = await db.from('pedidos').insert({ cliente_id: +$('pCliente').value, canal: $('pCanal').value, empleado_id: 1 }).select('id').single();
  if (error) return toast('Error: ' + error.message);
  const r1 = await db.from('detalle_pedidos').insert({ pedido_id: ped.id, producto_id: prod.id, cantidad: cant, precio_unitario: prod.precio });
  const r2 = await db.from('pagos').insert({ pedido_id: ped.id, metodo: $('pMetodo').value, monto: cant * prod.precio });
  toast(r1.error || r2.error ? 'Error: ' + (r1.error || r2.error).message : 'Pedido ' + ped.id + ' registrado');
  cargarPedidos();
};

// Productos
function renderProductos(){
  $('tProductos').innerHTML = '<tr><th>Producto</th><th>Categoría</th><th>Precio</th><th>Stock</th><th></th></tr>' +
    productos.map(p => `<tr><td>${esc(p.nombre)}</td><td>${esc(p.categorias.nombre)}</td><td>${money(p.precio)}</td><td>${p.stock}</td>
    <td><button data-edit="${p.id}">Editar</button><button class="del" data-delp="${p.id}">Eliminar</button></td></tr>`).join('');
}
function resetForm(){ editId = null; $('fProducto').reset(); $('prGuardar').textContent = 'Crear producto'; $('prCancelar').hidden = true; }
$('prCancelar').onclick = resetForm;
$('tProductos').onclick = async e => {
  if (e.target.dataset.edit) {
    const p = productos.find(x => x.id == e.target.dataset.edit); editId = p.id;
    $('prNombre').value = p.nombre; $('prCategoria').value = p.categoria_id; $('prPrecio').value = p.precio; $('prStock').value = p.stock;
    $('prGuardar').textContent = 'Guardar cambios'; $('prCancelar').hidden = false; $('prNombre').focus();
  } else if (e.target.dataset.delp) {
    if (!confirm('¿Eliminar este producto?')) return;
    const { error } = await db.from('productos').delete().eq('id', e.target.dataset.delp);
    toast(error ? 'No se puede eliminar: tiene pedidos asociados' : 'Producto eliminado'); cargarCatalogos();
  }
};
$('fProducto').onsubmit = async e => {
  e.preventDefault();
  const row = { nombre: $('prNombre').value, categoria_id: +$('prCategoria').value, precio: +$('prPrecio').value, stock: +$('prStock').value };
  const { error } = editId ? await db.from('productos').update(row).eq('id', editId) : await db.from('productos').insert(row);
  toast(error ? 'Error: ' + error.message : editId ? 'Producto actualizado' : 'Producto creado');
  resetForm(); cargarCatalogos();
};

cargarCatalogos(); cargarPedidos();
