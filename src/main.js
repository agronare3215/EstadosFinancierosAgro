(() => {
    // helpers
    const $ = (id) => document.getElementById(id);
    const LS_KEY = 'agronare_fin_v9';

    // ------------------ NUEVO: modo PDF (cuando true quitamos el símbolo en render) ------------------
    let isPdfMode = false;

    // logo SVG embebido por defecto (se usa si no subes logo)
    const defaultLogoSVG = `
  <svg xmlns="http://www.w3.org/2000/svg" width="400" height="160" viewBox="0 0 400 160">
    <defs>
      <linearGradient id="g1" x1="0" x2="1"><stop offset="0" stop-color="#06b6d4"/><stop offset="1" stop-color="#10b981"/></linearGradient>
      <linearGradient id="g2" x1="0" x2="1"><stop offset="0" stop-color="#34d399"/><stop offset="1" stop-color="#84cc16"/></linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="white" rx="10"/>
    <g transform="translate(40,10)">
      <path d="M40 20 C 10 40, 10 80, 40 100 C 80 120, 120 80, 100 40 C 88 12, 60 -4, 40 20 Z" fill="url(#g1)"/>
      <path d="M170 10 C 210 40, 220 90, 170 120 C 110 150, 60 130, 100 90 C 130 60, 170 10, 170 10 Z" fill="url(#g2)"/>
    </g>
    <text x="200" y="110" font-family="Georgia, serif" font-weight="700" font-size="36" fill="#0f5132">AGRONARE</text>
  </svg>`;
    let companyLogoDataUrl =
        'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(defaultLogoSVG)));

    // Utility: obtener símbolo de moneda según currency select (usa Intl)
    function getCurrencySymbol(code) {
        try {
            const parts = new Intl.NumberFormat(undefined, {
                style: 'currency',
                currency: code,
                minimumFractionDigits: 0
            }).formatToParts(1);
            const sym = parts.find((p) => p.type === 'currency');
            return sym ? sym.value : code;
        } catch (e) {
            if (code === 'USD') return '$';
            if (code === 'MXN') return '$';
            return code;
        }
    }

    // utility formatters
    function currencyCode() {
        return $('currencySelect') ? $('currencySelect').value || 'MXN' : 'MXN';
    }

    // ------------------ MODIFICADA: formatMoney ahora considera isPdfMode ------------------
    function formatMoney(n) {
        try {
            if (isPdfMode) {
                // en PDF solo mostrar número con separador de miles y 2 decimales, SIN símbolo
                return fmtNum(Number.isFinite(n) ? n : 0);
            }
            return new Intl.NumberFormat('es-MX', {
                style: 'currency',
                currency: currencyCode()
            }).format(Number.isFinite(n) ? n : 0);
        } catch (e) {
            return Number.isFinite(n) ? n.toFixed(2) : '0.00';
        }
    }

    function fmtNum(n) {
        return new Intl.NumberFormat('es-MX', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(Number.isFinite(n) ? n : 0);
    }

    // todos los ids de inputs a persistir (añade o quita si tu HTML difiere)
    const inputIds = [
        'caja',
        'bancos',
        'cxp',
        'inventarios',
        'terrenos',
        'maquinaria',
        'vehiculos',
        'depreciacion_acum',
        'intangibles',
        'proveedores',
        'prestamos_cp',
        'impuestos_pagar',
        'deuda_lp',
        'capital_social',
        'reservas',
        'utilidades_retenidas',
        'ventas_net',
        'devoluciones',
        'costo_ventas',
        'gasto_sueldos',
        'gasto_renta',
        'gasto_marketing',
        'gasto_intereses',
        'impuestos_calc',
        'delta_cxc',
        'delta_inventarios',
        'delta_cxp',
        'capex',
        'venta_activo',
        'deuda_emitida',
        'deuda_pagada',
        'dividendos_pag'
    ];

    // robust parse: extrae número desde una cadena formateada (ej. "$1,234.56" -> 1234.56)
    function parseNumberFromFormatted(str) {
        if (str === null || typeof str === 'undefined') return 0;
        const cleaned = String(str).replace(/\s/g, '').replace(/[^0-9.\-]/g, '');
        const parsed = parseFloat(cleaned);
        return Number.isFinite(parsed) ? parsed : 0;
    }

    // getNum lee desde data-raw si existe (valor numérico), si no intenta parsear el contenido textual
    function getNum(id) {
        const el = $(id);
        if (!el) return 0;
        if (el.dataset && typeof el.dataset.raw !== 'undefined' && el.dataset.raw !== '') {
            const n = Number(el.dataset.raw);
            return Number.isFinite(n) ? n : 0;
        }
        return parseNumberFromFormatted(el.value);
    }

    /* ---------- Cálculos centrales ---------- */
    function calculateAll() {
        const caja = getNum('caja'),
            bancos = getNum('bancos'),
            cxp = getNum('cxp'),
            inventarios = getNum('inventarios'),
            intangibles = getNum('intangibles');
        const terrenos = getNum('terrenos'),
            maquinaria = getNum('maquinaria'),
            vehiculos = getNum('vehiculos'),
            depreciacion_acum = getNum('depreciacion_acum');
        const total_act_corr = caja + bancos + cxp + inventarios;
        const prop_plant_bruto = terrenos + maquinaria + vehiculos;
        const total_act_no_corr = prop_plant_bruto - depreciacion_acum + intangibles;
        const total_activos = total_act_corr + total_act_no_corr;

        const proveedores = getNum('proveedores'),
            prestamos_cp = getNum('prestamos_cp'),
            impuestos_pagar = getNum('impuestos_pagar'),
            deuda_lp = getNum('deuda_lp');
        const total_pasivo_corr = proveedores + prestamos_cp + impuestos_pagar;
        const total_pasivo_lp = deuda_lp;
        const total_pasivos = total_pasivo_corr + total_pasivo_lp;

        const capital_social = getNum('capital_social'),
            reservas = getNum('reservas'),
            utilidades_retenidas = getNum('utilidades_retenidas');

        const ventas_net = getNum('ventas_net'),
            devoluciones = getNum('devoluciones'),
            costo_ventas = getNum('costo_ventas');
        const neto_ventas = ventas_net - devoluciones;
        const utilidad_bruta = neto_ventas - costo_ventas;

        const g_sueldos = getNum('gasto_sueldos'),
            g_renta = getNum('gasto_renta'),
            g_mark = getNum('gasto_marketing'),
            g_inter = getNum('gasto_intereses');
        const gastos_operativos = g_sueldos + g_renta + g_mark;
        const utilidad_operativa = utilidad_bruta - gastos_operativos;
        const resultado_antes_impuestos = utilidad_operativa - g_inter;
        const impuestos = getNum('impuestos_calc');
        const utilidad_neta = resultado_antes_impuestos - impuestos;

        const delta_cxc = getNum('delta_cxc'),
            delta_inv = getNum('delta_inventarios'),
            delta_cxp = getNum('delta_cxp');
        const capex = getNum('capex'),
            venta_activo = getNum('venta_activo');
        const deuda_emitida = getNum('deuda_emitida'),
            deuda_pagada = getNum('deuda_pagada'),
            dividendos_pag = getNum('dividendos_pag');

        const flujo_operativo = utilidad_neta + g_inter - delta_cxc - delta_inv + delta_cxp;
        const flujo_inversion = -capex + venta_activo;
        const flujo_financiamiento = deuda_emitida - deuda_pagada - dividendos_pag;
        const cambio_efectivo = flujo_operativo + flujo_inversion + flujo_financiamiento;

        const util_finales = utilidades_retenidas + utilidad_neta - dividendos_pag;
        const patrimonio_total = capital_social + reservas + util_finales;

        const liquidez_corriente = total_pasivo_corr > 0 ? total_act_corr / total_pasivo_corr : null;
        const endeudamiento = total_activos > 0 ? total_pasivos / total_activos : null;
        const margen_neto = neto_ventas > 0 ? utilidad_neta / neto_ventas : null;
        const roa = total_activos > 0 ? utilidad_neta / total_activos : null;
        const roe = patrimonio_total > 0 ? utilidad_neta / patrimonio_total : null;

        return {
            // inputs
            caja,
            bancos,
            cxp,
            inventarios,
            intangibles,
            terrenos,
            maquinaria,
            vehiculos,
            depreciacion_acum,
            // totals
            total_act_corr,
            prop_plant_bruto,
            total_act_no_corr,
            total_activos,
            proveedores,
            prestamos_cp,
            impuestos_pagar,
            deuda_lp,
            total_pasivo_corr,
            total_pasivo_lp,
            total_pasivos,
            capital_social,
            reservas,
            utilidades_retenidas,
            patrimonio_total,
            util_finales,
            ventas_net,
            devoluciones,
            neto_ventas,
            costo_ventas,
            utilidad_bruta,
            g_sueldos,
            g_renta,
            g_mark,
            g_inter,
            gastos_operativos,
            utilidad_operativa,
            resultado_antes_impuestos,
            impuestos,
            utilidad_neta,
            delta_cxc,
            delta_inv,
            delta_cxp,
            capex,
            venta_activo,
            deuda_emitida,
            deuda_pagada,
            dividendos_pag,
            flujo_operativo,
            flujo_inversion,
            flujo_financiamiento,
            cambio_efectivo,
            liquidez_corriente,
            endeudamiento,
            margen_neto,
            roa,
            roe
        };
    }

    /* ---------- Renderers ---------- */
    function getReportHeader() {
        return {
            companyName: $('companyName') ? $('companyName').value || 'Agronare S.A. de C.V.' : 'Agronare',
            reportDate:
                $('reportDate') && $('reportDate').value
                    ? new Date($('reportDate').value + 'T12:00:00').toLocaleDateString('es-MX')
                    : new Date().toLocaleDateString('es-MX')
        };
    }

    function renderBalance(data) {
        const h = getReportHeader();
        const verticalOn = $('verticalAnalysisToggle') && $('verticalAnalysisToggle').checked;
        const totalActivos = data.total_activos !== 0 ? data.total_activos : 1;
        const pct = (val) => (verticalOn ? `${fmtNum((val / totalActivos) * 100)}%` : null);

        const buildRow = (l, v, isTotal = false, isSub = false) => {
            const p = pct(v);
            const pCell = verticalOn ? `<td class="text-right small text-slate-500">${p || ''}</td>` : '';
            const subClass = isSub ? 'pl-4' : '';
            return `<tr class="${isTotal ? 'total-cell' : ''}"><td class="${subClass}">${l}</td><td class="text-right">${formatMoney(
                v
            )}</td>${pCell}</tr>`;
        };
        const headerCols = verticalOn ? '<th class="text-right w-28">% Total</th>' : '';

        const activosTable = `
      <h3 id="activos-sep" class="font-bold mb-2 text-blue-700">ACTIVOS</h3>
      <table class="w-full text-sm" role="table" aria-label="Tabla de activos">
        <thead><tr class="border-b"><th class="text-left">Activo Corriente</th><th class="text-right">Valor</th>${headerCols}</tr></thead>
        <tbody>
          ${buildRow('Caja', data.caja)}
          ${buildRow('Bancos', data.bancos)}
          ${buildRow('Cuentas por Cobrar', data.cxp)}
          ${buildRow('Inventarios', data.inventarios)}
          ${buildRow('Total Activos Corrientes', data.total_act_corr, true)}
        </tbody>
        <thead><tr><th class="pt-4 text-left">Activo No Corriente</th><th></th>${verticalOn ? '<th></th>' : ''}</tr></thead>
        <tbody>
          ${buildRow('Terrenos (bruto)', data.terrenos)}
          ${buildRow('Maquinaria (bruto)', data.maquinaria)}
          ${buildRow('Vehículos (bruto)', data.vehiculos)}
          ${buildRow('(-) Depreciación acumulada', -data.depreciacion_acum)}
          ${buildRow('Intangibles', data.intangibles)}
          ${buildRow('Total Activos No Corrientes', data.total_act_no_corr, true)}
        </tbody>
        <tfoot>
          ${buildRow('TOTAL ACTIVOS', data.total_activos, true)}
        </tfoot>
      </table>`;

        const pasivosPatrimonioTable = `
      <h3 id="pasivos-sep" class="font-bold mb-2 text-orange-700">PASIVOS Y PATRIMONIO</h3>
      <table class="w-full text-sm" role="table" aria-label="Tabla de pasivos y patrimonio">
        <thead><tr class="border-b"><th class="text-left">Pasivo Corriente</th><th class="text-right">Valor</th>${headerCols}</tr></thead>
        <tbody>
          ${buildRow('Proveedores', data.proveedores)}
          ${buildRow('Préstamos Corto Plazo', data.prestamos_cp)}
          ${buildRow('Impuestos por pagar', data.impuestos_pagar)}
          ${buildRow('Total Pasivos Corrientes', data.total_pasivo_corr, true)}
        </tbody>
        <thead><tr><th class="pt-4 text-left">Pasivo No Corriente</th><th></th>${verticalOn ? '<th></th>' : ''}</tr></thead>
        <tbody>
          ${buildRow('Deuda Largo Plazo', data.deuda_lp)}
          ${buildRow('Total Pasivos No Corrientes', data.total_pasivo_lp, true)}
        </tbody>
        <tfoot>
          ${buildRow('TOTAL PASIVOS', data.total_pasivos, true)}
        </tfoot>
        <thead><tr><th class="pt-4 text-left">Patrimonio</th><th></th>${verticalOn ? '<th></th>' : ''}</tr></thead>
        <tbody>
          ${buildRow('Capital Social', data.capital_social)}
          ${buildRow('Reservas', data.reservas)}
          ${buildRow('Utilidades Retenidas (final)', data.util_finales)}
          ${buildRow('PATRIMONIO TOTAL', data.patrimonio_total, true)}
        </tbody>
        <tfoot>
          ${buildRow('TOTAL PASIVO + PATRIMONIO', data.total_pasivos + data.patrimonio_total, true)}
        </tfoot>
      </table>`;

        const html = `
      <div class="mb-4">
        <h2 class="text-2xl font-bold">Balance General</h2>
        <p class="text-sm">${h.companyName} — Al ${h.reportDate}</p>
      </div>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="bg-slate-50 p-4 rounded-lg border" role="region">${activosTable}</div>
        <div class="bg-slate-50 p-4 rounded-lg border" role="region">${pasivosPatrimonioTable}</div>
      </div>`;
        if ($('content-balance')) $('content-balance').innerHTML = html;
    }

    function renderResultados(data) {
        const h = getReportHeader();
        const verticalOn = $('verticalAnalysisToggle') && $('verticalAnalysisToggle').checked;
        const totalVentas = data.neto_ventas !== 0 ? data.neto_ventas : 1;
        const pct = (val) => (verticalOn ? `${fmtNum((val / totalVentas) * 100)}%` : null);

        const buildRow = (l, v, isTotal = false, isSub = false) => {
            const p = pct(v);
            const pCell = verticalOn ? `<td class="text-right small text-slate-500">${p || ''}</td>` : '';
            const subClass = isSub ? 'pl-4' : '';
            return `<tr class="${isTotal ? 'total-cell' : ''}"><td class="${subClass}">${l}</td><td class="text-right">${formatMoney(
                v
            )}</td>${pCell}</tr>`;
        };
        const headerCols = verticalOn ? `<th class="text-right w-28">% Ventas</th>` : '';

        const html = `
      <div class="mb-4"><h2 class="text-2xl font-bold">Estado de Resultados</h2><p class="text-sm">${h.companyName} — Periodo: ${h.reportDate}</p></div>
      <div class="bg-slate-50 p-4 rounded-lg border" role="region">
      <table class="w-full text-sm" id="er-tabla">
        <thead><tr class="border-b"><th class="text-left">Concepto</th><th class="text-right">Valor</th>${headerCols}</tr></thead>
        <tbody>
          ${buildRow('Ventas Brutas', data.ventas_net)}
          ${buildRow('(-) Devoluciones', -data.devoluciones)}
          ${buildRow('Ventas Netas', data.neto_ventas, true)}
          ${buildRow('(-) Costo de Ventas', -data.costo_ventas)}
          ${buildRow('Utilidad Bruta', data.utilidad_bruta, true)}
          <tr><td class="pt-4">Gastos Operativos</td><td></td>${verticalOn ? '<td></td>' : ''}</tr>
          ${buildRow('Sueldos', -data.g_sueldos, false, true)}
          ${buildRow('Renta', -data.g_renta, false, true)}
          ${buildRow('Marketing', -data.g_mark, false, true)}
          ${buildRow('Total Gastos Operativos', -data.gastos_operativos, true)}
          ${buildRow('Utilidad Operativa (EBIT)', data.utilidad_operativa, true)}
          ${buildRow('(-) Gastos Financieros', -data.g_intereses)}
          ${buildRow('Resultado antes de Ingresos', data.resultado_antes_impuestos, true)}
          ${buildRow('(-) Impuestos', -data.impuestos)}
        </tbody>
        <tfoot>
          ${buildRow('UTILIDAD NETA', data.utilidad_neta, true)}
        </tfoot>
      </table>
      </div>`;
        if ($('content-resultados')) $('content-resultados').innerHTML = html;
    }

    function renderFlujos(data) {
        const h = getReportHeader();
        const html = `
      <div class="mb-4"><h2 class="text-2xl font-bold">Estado de Flujos de Efectivo</h2><p class="text-sm">${h.companyName} — Periodo: ${h.reportDate}</p></div>
      <div class="bg-slate-50 p-4 rounded-lg border" role="region">
        <table class="w-full text-sm" id="flujos-tabla">
          <tr class="total-cell"><td>Flujo de Actividades de Operación</td><td class="text-right">${formatMoney(
            data.flujo_operativo
        )}</td></tr>
          <tr><td class="pl-4">Utilidad Neta</td><td class="text-right">${formatMoney(data.utilidad_neta)}</td></tr>
          <tr><td class="pl-4">(+) Gastos de Intereses</td><td class="text-right">${formatMoney(data.g_intereses)}</td></tr>
          <tr><td class="pl-4">(-) Δ Cuentas por Cobrar</td><td class="text-right">${formatMoney(-data.delta_cxc)}</td></tr>
          <tr><td class="pl-4">(-) Δ Inventarios</td><td class="text-right">${formatMoney(-data.delta_inv)}</td></tr>
          <tr><td class="pl-4">(+) Δ Cuentas por Pagar</td><td class="text-right">${formatMoney(data.delta_cxp)}</td></tr>

          <tr class="total-cell"><td class="pt-4">Flujo de Actividades de Inversión</td><td class="text-right">${formatMoney(
            data.flujo_inversion
        )}</td></tr>
          <tr><td class="pl-4">(-) Compras de Activo Fijo (CAPEX)</td><td class="text-right">${formatMoney(
            -data.capex
        )}</td></tr>
          <tr><td class="pl-4">(+) Venta de Activos</td><td class="text-right">${formatMoney(data.venta_activo)}</td></tr>

          <tr class="total-cell"><td class="pt-4">Flujo de Actividades de Financiación</td><td class="text-right">${formatMoney(
            data.flujo_financiamiento
        )}</td></tr>
          <tr><td class="pl-4">(+) Nueva Deuda Emitida</td><td class="text-right">${formatMoney(data.deuda_emitida)}</td></tr>
          <tr><td class="pl-4">(-) Pago de Deuda</td><td class="text-right">${formatMoney(-data.deuda_pagada)}</td></tr>
          <tr><td class="pl-4">(-) Dividendos Pagados</td><td class="text-right">${formatMoney(-data.dividendos_pag)}</td></tr>

          <tr class="total-cell mt-4 border-t-2 border-black"><td class="pt-4">CAMBIO NETO EN EFECTIVO</td><td class="text-right">${formatMoney(
            data.cambio_efectivo
        )}</td></tr>
        </table>
      </div>`;
        if ($('content-flujos')) $('content-flujos').innerHTML = html;
    }

    function renderPatrimonio(data) {
        const h = getReportHeader();
        const html = `
      <div class="mb-4"><h2 class="text-2xl font-bold">Estado de Cambios en el Patrimonio Neto</h2><p class="text-sm">${h.companyName} — Periodo: ${h.reportDate}</p></div>
      <div class="bg-slate-50 p-4 rounded-lg border" role="region">
        <table class="w-full text-sm" id="patrimonio-tabla">
          <tr><td>Utilidades Retenidas (inicio del periodo)</td><td class="text-right">${formatMoney(
            data.utilidades_retenidas
        )}</td></tr>
          <tr><td>(+) Utilidad Neta del Periodo</td><td class="text-right">${formatMoney(data.utilidad_neta)}</td></tr>
          <tr><td>(-) Dividendos Pagados</td><td class="text-right">${formatMoney(-data.dividendos_pag)}</td></tr>
          <tr class="total-cell"><td>Utilidades Retenidas (final del periodo)</td><td class="text-right">${formatMoney(
            data.util_finales
        )}</td></tr>
          <tr class="mt-4 border-t"><td class="pt-4">Capital Social</td><td class="text-right">${formatMoney(
            data.capital_social
        )}</td></tr>
          <tr><td>Reservas</td><td class="text-right">${formatMoney(data.reservas)}</td></tr>
          <tr class="total-cell mt-4 border-t-2 border-black"><td class="pt-4">PATRIMONIO TOTAL</td><td class="text-right">${formatMoney(
            data.patrimonio_total
        )}</td></tr>
        </table>
      </div>`;
        if ($('content-patrimonio')) $('content-patrimonio').innerHTML = html;
    }

    /* ---------- Charts & Ratios ---------- */
    let chartBalance = null,
        chartResult = null;
    function renderRatiosAndCharts(data) {
        if ($('ratio-liquidez'))
            $('ratio-liquidez').textContent = data.liquidez_corriente ? fmtNum(data.liquidez_corriente) : 'N/A';
        if ($('ratio-endeudamiento'))
            $('ratio-endeudamiento').textContent = data.endeudamiento
                ? fmtNum(data.endeudamiento * 100) + '%'
                : 'N/A';
        if ($('ratio-margen'))
            $('ratio-margen').textContent = data.margen_neto ? fmtNum(data.margen_neto * 100) + '%' : 'N/A';
        if ($('ratio-roa')) $('ratio-roa').textContent = data.roa ? fmtNum(data.roa * 100) + '%' : 'N/A';
        if ($('ratio-roe')) $('ratio-roe').textContent = data.roe ? fmtNum(data.roe * 100) + '%' : 'N/A';

        try {
            if (window.Chart) {
                const ctxB = $('chart-balance') ? $('chart-balance').getContext('2d') : null;
                const ctxR = $('chart-result') ? $('chart-result').getContext('2d') : null;

                if (ctxB) {
                    if (!chartBalance) {
                        chartBalance = new Chart(ctxB, {
                            type: 'bar',
                            data: {
                                labels: ['Comparativo'],
                                datasets: [
                                    { label: 'Total Activos', data: [data.total_activos], backgroundColor: '#3b82f6' },
                                    { label: 'Total Pasivos', data: [data.total_pasivos], backgroundColor: '#f97316' },
                                    { label: 'Patrimonio', data: [data.patrimonio_total], backgroundColor: '#16a34a' }
                                ]
                            },
                            options: { maintainAspectRatio: false, responsive: true }
                        });
                    } else {
                        chartBalance.data.datasets[0].data = [data.total_activos];
                        chartBalance.data.datasets[1].data = [data.total_pasivos];
                        chartBalance.data.datasets[2].data = [data.patrimonio_total];
                        chartBalance.update();
                    }
                }

                if (ctxR) {
                    const d = [
                        Math.max(0, data.utilidad_neta),
                        Math.max(0, data.costo_ventas),
                        Math.max(0, data.gastos_operativos)
                    ];
                    if (!chartResult) {
                        chartResult = new Chart(ctxR, {
                            type: 'doughnut',
                            data: { labels: ['Utilidad Neta', 'Costo', 'Gastos'], datasets: [{ data: d, backgroundColor: ['#16a34a', '#f59e0b', '#ef4444'] }] },
                            options: { maintainAspectRatio: false, responsive: true }
                        });
                    } else {
                        chartResult.data.datasets[0].data = d;
                        chartResult.update();
                    }
                }
            }
        } catch (e) {
            console.error(e);
        }
    }

    /* ---------- Persistence (localStorage, JSON) ---------- */
    function collectForm() {
        const o = {};
        inputIds.forEach((id) => {
            o[id] = getNum(id);
        });
        o.companyName = $('companyName') ? $('companyName').value : '';
        o.reportDate = $('reportDate') ? $('reportDate').value : '';
        o.currency = $('currencySelect') ? $('currencySelect').value : '';
        o.reportNotes = $('reportNotes') ? $('reportNotes').value : '';
        return o;
    }
    function applyForm(obj) {
        if (!obj) return;
        inputIds.forEach((id) => {
            if ($(id) && typeof obj[id] !== 'undefined') {
                $(id).dataset.raw = obj[id];
                $(id).value = formatMoney(Number(obj[id]) || 0);
            }
        });
        if ($('companyName')) $('companyName').value = obj.companyName || '';
        if ($('reportDate')) $('reportDate').value = obj.reportDate || '';
        if ($('currencySelect')) $('currencySelect').value = obj.currency || 'MXN';
        if ($('reportNotes')) $('reportNotes').value = obj.reportNotes || '';
    }
    function saveToLocal(show = true) {
        try {
            localStorage.setItem(LS_KEY, JSON.stringify(collectForm()));
            if (show) showStatus('Datos guardados en el navegador.');
            setTimeout(hideStatus, 1600);
        } catch (e) {
            console.error(e);
            showStatus('Error guardando localmente.');
        }
    }
    function loadFromLocal() {
        const raw = localStorage.getItem(LS_KEY);
        if (!raw) {
            showStatus('No hay datos guardados.');
            setTimeout(hideStatus, 2000);
            return;
        }
        applyForm(JSON.parse(raw));
        updateAll(false);
        showStatus('Datos recuperados desde el navegador.');
        setTimeout(hideStatus, 1600);
    }

    function saveJsonFile() {
        const data = collectForm();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `agronare_datos_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(a.href);
        showStatus('Archivo JSON descargado.');
        setTimeout(hideStatus, 1600);
    }
    function loadJsonFile(e) {
        const f = e.target.files[0];
        if (!f) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const parsed = JSON.parse(ev.target.result);
                applyForm(parsed);
                updateAll();
                showStatus('Archivo JSON cargado.');
                setTimeout(hideStatus, 1600);
            } catch (err) {
                showStatus('Error leyendo JSON.');
                console.error(err);
            }
        };
        reader.readAsText(f);
        e.target.value = '';
    }

    function showStatus(msg) {
        const s = $('app-status');
        if (!s) return;
        s.textContent = msg;
        s.classList.remove('sr-only');
        s.setAttribute('aria-live', 'polite');
    }
    function hideStatus() {
        const s = $('app-status');
        if (!s) return;
        s.textContent = '';
        s.classList.add('sr-only');
    }

    /* ---------- Loader ---------- */
    function showLoader() {
        const l = $('loader');
        if (l) l.classList.remove('hidden');
    }
    function hideLoader() {
        const l = $('loader');
        if (l) l.classList.add('hidden');
    }

    /* ---------- Helpers: convertir SVG->PNG o URL->PNG --- */
    async function svgToPngDataUrl(svgText, width = 400, height = 160) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, width, height);
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/png'));
            };
            img.onerror = (e) => reject(e);
            img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgText)));
        });
    }
    async function imageUrlToPngDataUrl(imgUrl, width = 400, height = 160) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, width, height);
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/png'));
            };
            img.onerror = (e) => reject(e);
            img.src = imgUrl;
        });
    }

    /* ---------- Export PDF (html2canvas + jsPDF) ---------- */
    function createWatermarkDataUrl(text, widthPx = 1200, heightPx = 1200, opacity = 0.12, fontSize = 72) {
        const canvas = document.createElement('canvas');
        canvas.width = widthPx;
        canvas.height = heightPx;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, widthPx, heightPx);
        ctx.globalAlpha = opacity;
        ctx.fillStyle = '#666666';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `bold ${fontSize}px Inter, Arial, sans-serif`;
        ctx.translate(widthPx / 2, heightPx / 2);
        ctx.rotate(-0.6);
        ctx.fillText(text, 0, 0);
        return canvas.toDataURL('image/png');
    }

    function prepareExportForPDF() {
        isPdfMode = true;

        const hideSelectors = ['.no-print', '#main-form', 'nav', '#content-datos', '#content-graficos', '.tab-button'];
        hideSelectors.forEach((sel) => {
            document.querySelectorAll(sel).forEach((el) => {
                el.dataset._oldDisplay = el.style.display || '';
                el.style.display = 'none';
            });
        });

        ['content-balance', 'content-resultados', 'content-flujos', 'content-patrimonio'].forEach((id) => {
            const el = $(id);
            if (el) {
                el.classList.remove('hidden');
                if (el.dataset._oldDisplay) {
                    el.style.display = el.dataset._oldDisplay;
                    delete el.dataset._oldDisplay;
                }
            }
        });

        updateAll(false);
    }

    function restoreAfterPDF() {
        const hideSelectors = ['.no-print', '#main-form', 'nav', '#content-datos', '#content-graficos', '.tab-button'];
        hideSelectors.forEach((sel) => {
            document.querySelectorAll(sel).forEach((el) => {
                if (typeof el.dataset._oldDisplay !== 'undefined') {
                    el.style.display = el.dataset._oldDisplay || '';
                    delete el.dataset._oldDisplay;
                } else {
                    el.style.display = '';
                }
            });
        });

        isPdfMode = false;
        updateAll(false);
    }

    async function exportPDFWithOptions() {
        showLoader();
        try {
            const size = $('pdfSize').value || 'a4';
            const orientation = $('pdfOrientation').value || 'portrait';
            const scale = parseFloat($('pdfScale').value) || 2;
            const includeHeaderLogo = $('pdfHeaderLogo').checked;
            const watermarkOn = $('pdfWatermarkToggle').checked;
            const watermarkText = $('pdfWatermarkText').value || '';
            const watermarkOpacity = parseFloat($('pdfWatermarkOpacity').value) || 0.12;
            const watermarkSize = parseInt($('pdfWatermarkSize').value, 10) || 72;
            const pageNumbersOn = $('pdfPageNumbersToggle').checked;
            const headerFont = $('pdfHeaderFont').value || 'Inter, Arial, sans-serif';

            prepareExportForPDF();

            const headerDiv = document.createElement('div');
            headerDiv.className = 'pdf-temp-header';
            headerDiv.style.fontFamily = headerFont;
            const headerImg = includeHeaderLogo
                ? `<img src="${companyLogoDataUrl}" style="height:48px;width:48px;border-radius:6px" alt="Logo">`
                : '';
            const companyName = $('companyName').value || 'Agronare S.A. de C.V.';
            const dateText = $('reportDate').value
                ? new Date($('reportDate').value + 'T12:00:00').toLocaleDateString('es-MX')
                : new Date().toLocaleDateString('es-MX');
            headerDiv.innerHTML = `${headerImg}<div style="font-family:${headerFont};color:#0f172a;"><div style="font-weight:700;font-size:18px">${companyName}</div><div style="font-size:12px;color:#475569">Reporte al ${dateText}</div></div>`;
            const appRoot = document.querySelector('main');
            appRoot.insertBefore(headerDiv, appRoot.firstChild);

            const canvas = await html2canvas(appRoot, { scale: scale, useCORS: true, backgroundColor: '#ffffff' });

            headerDiv.remove();
            restoreAfterPDF();

            const { jsPDF } = window.jspdf;
            const pageSizes = { a4: { w: 210, h: 297 }, letter: { w: 216, h: 279 } };
            const pageSize = pageSizes[size] || pageSizes.a4;
            const pdf = new jsPDF({ orientation: orientation, unit: 'mm', format: [pageSize.w, pageSize.h] });

            const margin = 10;
            const usableWidth = pageSize.w - margin * 2;
            const pxPerMm = canvas.width / usableWidth;
            const pageHeightPx = Math.floor((pageSize.h - margin * 2) * pxPerMm);
            const totalPages = Math.ceil(canvas.height / pageHeightPx);

            const watermarkDataUrl =
                watermarkOn && watermarkText
                    ? createWatermarkDataUrl(watermarkText, 1200, 1200, watermarkOpacity, watermarkSize)
                    : null;

            for (let p = 0; p < totalPages; p++) {
                const pageCanvas = document.createElement('canvas');
                pageCanvas.width = canvas.width;
                const thisPageH = Math.min(pageHeightPx, canvas.height - p * pageHeightPx);
                pageCanvas.height = thisPageH;
                const ctx = pageCanvas.getContext('2d');
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
                ctx.drawImage(canvas, 0, -p * pageHeightPx);

                const pageDataUrl = pageCanvas.toDataURL('image/jpeg', 0.95);
                const imgProps = pdf.getImageProperties(pageDataUrl);
                const pdfImgWidth = usableWidth;
                const pdfImgHeight = (imgProps.height * pdfImgWidth) / imgProps.width;

                if (p > 0) pdf.addPage();
                pdf.addImage(pageDataUrl, 'JPEG', margin, 12, pdfImgWidth, pdfImgHeight);

                if (watermarkDataUrl) {
                    pdf.addImage(watermarkDataUrl, 'PNG', 0, 0, pageSize.w, pageSize.h);
                }

                pdf.setFontSize(9);
                pdf.setTextColor(100);
                const companyNameFooter = $('companyName').value || 'Agronare';
                pdf.text(companyNameFooter, margin, pageSize.h - 8);
                const dateText2 = dateText;
                pdf.text(dateText2, pageSize.w - margin - pdf.getTextWidth(dateText2), pageSize.h - 8);

                if (pageNumbersOn) {
                    pdf.text(`Página ${p + 1} de ${totalPages}`, pageSize.w / 2, pageSize.h - 8, { align: 'center' });
                }
            }

            const filename = `agronare_reporte_${new Date().toISOString().split('T')[0]}.pdf`;
            pdf.save(filename);
            showStatus('PDF generado y descargado.');
            setTimeout(hideStatus, 1400);
        } catch (err) {
            console.error('Error generando PDF:', err);
            showStatus('Error al generar PDF. Revisa la consola.');
            setTimeout(hideStatus, 2000);
        } finally {
            hideLoader();
        }
    }

    /* ---------- Export XLSX (ExcelJS) ---------- */
    async function exportXLSX() {
        showLoader();
        try {
            let pngDataUrl = null;
            if (companyLogoDataUrl && companyLogoDataUrl.startsWith('data:image/svg+xml')) {
                const svgText = decodeURIComponent(escape(atob(companyLogoDataUrl.split(',')[1])));
                pngDataUrl = await svgToPngDataUrl(svgText, 400, 160);
            } else if (companyLogoDataUrl && /^data:image\/(png|jpeg|jpg)/.test(companyLogoDataUrl)) {
                pngDataUrl = companyLogoDataUrl;
            } else if (companyLogoDataUrl && companyLogoDataUrl.startsWith('http')) {
                pngDataUrl = await imageUrlToPngDataUrl(companyLogoDataUrl, 400, 160);
            }

            const data = calculateAll();
            const workbook = new ExcelJS.Workbook();
            workbook.creator = 'Agronare';
            workbook.created = new Date();
            const sheet = workbook.addWorksheet('Balance');

            if (pngDataUrl) {
                const base64 = pngDataUrl.split(',')[1];
                const imageId = workbook.addImage({ base64: base64, extension: 'png' });
                sheet.addImage(imageId, { tl: { col: 0, row: 0 }, ext: { width: 160, height: 64 } });
            }

            sheet.getCell('C1').value = `${$('companyName').value || 'Agronare'}\nReporte: ${$('reportDate').value
                    ? new Date($('reportDate').value + 'T12:00:00').toLocaleDateString('es-MX')
                    : new Date().toLocaleDateString('es-MX')
                }`;
            sheet.getCell('C1').alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
            sheet.columns = [{ width: 36 }, { width: 18 }];

            let r = 6;
            const activosRows = [
                ['Caja', data.caja],
                ['Bancos', data.bancos],
                ['Cuentas por Cobrar', data.cxp],
                ['Inventarios', data.inventarios],
                ['Terrenos (bruto)', data.terrenos],
                ['Maquinaria (bruto)', data.maquinaria],
                ['Vehículos (bruto)', data.vehiculos],
                ['(-) Depreciación acumulada', -data.depreciacion_acum],
                ['Intangibles', data.intangibles],
                ['TOTAL ACTIVOS', data.total_activos]
            ];
            activosRows.forEach((row) => {
                sheet.getCell(`A${r}`).value = row[0];
                sheet.getCell(`B${r}`).value = typeof row[1] === 'number' ? row[1] : 0;
                sheet.getCell(`B${r}`).numFmt = '"$"#,##0.00;[Red]-"$"#,##0.00';
                if (String(row[0]).toUpperCase().includes('TOTAL')) sheet.getRow(r).font = { bold: true };
                r++;
            });

            r += 2;
            const pasRows = [
                ['Proveedores', data.proveedores],
                ['Préstamos CP', data.prestamos_cp],
                ['Impuestos por pagar', data.impuestos_pagar],
                ['Total Pasivos', data.total_pasivos],
                [],
                ['Capital social', data.capital_social],
                ['Reservas', data.reservas],
                ['Utilidades retenidas (final)', data.util_finales],
                ['PATRIMONIO TOTAL', data.patrimonio_total],
                ['TOTAL PASIVO + PATRIMONIO', data.total_pasivos + data.patrimonio_total]
            ];
            pasRows.forEach((row) => {
                if (row.length === 0) {
                    r++;
                    return;
                }
                sheet.getCell(`A${r}`).value = row[0];
                sheet.getCell(`B${r}`).value = typeof row[1] === 'number' ? row[1] : '';
                if (typeof row[1] === 'number') sheet.getCell(`B${r}`).numFmt = '"$"#,##0.00;[Red]-"$"#,##0.00';
                if (String(row[0]).toUpperCase().includes('TOTAL')) sheet.getRow(r).font = { bold: true };
                r++;
            });

            const buffer = await workbook.xlsx.writeBuffer();
            saveAs(
                new Blob([buffer], { type: 'application/octet-stream' }),
                `agronare_reporte_${new Date().toISOString().split('T')[0]}.xlsx`
            );
            showStatus('Archivo Excel generado.');
            setTimeout(hideStatus, 1400);
        } catch (e) {
            console.error('Error exportando XLSX', e);
            showStatus('Error exportando XLSX. Revisa la consola.');
            setTimeout(hideStatus, 2000);
        } finally {
            hideLoader();
        }
    }

    /* ---------- NUEVO: Análisis con Gemini ---------- */
    async function generateFinancialAnalysis() {
        const resultContainer = $('gemini-analysis-result');
        if (!resultContainer) {
            console.error('El contenedor para el resultado del análisis de IA no fue encontrado (se esperaba #gemini-analysis-result)');
            return;
        }

        showLoader();
        resultContainer.innerHTML = '<p class="text-center">Generando análisis con IA...</p>';

        try {
            const data = calculateAll();
            const currency = currencyCode();

            // Simplificar los datos para un prompt más claro
            const summaryForAI = {
                'Moneda': currency,
                'Activos Totales': data.total_activos,
                'Pasivos Totales': data.total_pasivos,
                'Patrimonio Total': data.patrimonio_total,
                'Ventas Netas': data.neto_ventas,
                'Utilidad Bruta': data.utilidad_bruta,
                'Utilidad Neta': data.utilidad_neta,
                'Flujo de Efectivo Operativo': data.flujo_operativo,
                'Ratio de Liquidez Corriente': data.liquidez_corriente ? data.liquidez_corriente.toFixed(2) : 'N/A',
                'Ratio de Endeudamiento (Pasivo/Activo)': data.endeudamiento ? `${(data.endeudamiento * 100).toFixed(2)}%` : 'N/A',
                'Margen Neto sobre Ventas': data.margen_neto ? `${(data.margen_neto * 100).toFixed(2)}%` : 'N/A',
                'ROA (Retorno sobre Activos)': data.roa ? `${(data.roa * 100).toFixed(2)}%` : 'N/A',
                'ROE (Retorno sobre Patrimonio)': data.roe ? `${(data.roe * 100).toFixed(2)}%` : 'N/A'
            };

            const systemPrompt = `Actúa como un analista financiero experto especializado en el sector agrícola. Tu tarea es analizar los siguientes datos financieros. Proporciona un resumen ejecutivo claro y conciso. Luego, identifica 3 fortalezas clave y 3 debilidades principales. Finalmente, ofrece 3 recomendaciones estratégicas y accionables para mejorar la salud financiera de la empresa. Formatea tu respuesta usando Markdown, con encabezados claros para cada sección.`;

            const userQuery = `Por favor, analiza los siguientes datos financieros de la empresa: ${JSON.stringify(summaryForAI, null, 2)}`;

            const apiKey = ""; // La API key se gestiona en el entorno de ejecución
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

            const payload = {
                contents: [{ parts: [{ text: userQuery }] }],
                systemInstruction: {
                    parts: [{ text: systemPrompt }]
                },
            };

            let responseText = '';
            let retries = 3;
            let delay = 1000;

            while (retries > 0) {
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (response.ok) {
                    const result = await response.json();
                    const candidate = result.candidates?.[0];
                    if (candidate && candidate.content?.parts?.[0]?.text) {
                        responseText = candidate.content.parts[0].text;
                        break; // Éxito, salir del bucle
                    }
                }

                retries--;
                if (retries > 0) {
                    await new Promise(resolve => setTimeout(resolve, delay));
                    delay *= 2; // Backoff exponencial
                } else {
                    throw new Error('No se pudo obtener una respuesta válida del modelo de IA después de varios intentos.');
                }
            }

            // Usar una librería como 'marked' sería ideal en producción para convertir Markdown a HTML de forma segura.
            // Por simplicidad aquí, hacemos un reemplazo básico.
            const formattedHtml = responseText
                .replace(/### (.*)/g, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>')
                .replace(/## (.*)/g, '<h2 class="text-xl font-bold mt-4 mb-2">$1</h2>')
                .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
                .replace(/\* ([^*]+)/g, '<li class="ml-5 list-disc">$1</li>')
                .replace(/\n/g, '<br>');

            resultContainer.innerHTML = `<div class="prose prose-sm max-w-none dark:prose-invert">${formattedHtml}</div>`;

        } catch (error) {
            console.error("Error al generar análisis financiero:", error);
            resultContainer.innerHTML = `<p class="text-red-500 text-center">Ocurrió un error al contactar al servicio de IA. Por favor, inténtalo de nuevo más tarde.</p>`;
        } finally {
            hideLoader();
        }
    }

    /* ---------- UI helpers ---------- */
    function showConfirmModal(message, onConfirm) {
        if (confirm(message)) onConfirm();
    }
    function clearLocal() {
        showConfirmModal('¿Está seguro de que desea borrar todos los datos guardados?', () => {
            localStorage.removeItem(LS_KEY);
            showStatus('Datos eliminados.');
            setTimeout(hideStatus, 1400);
        });
    }
    function resetForm() {
        showConfirmModal('¿Está seguro de que desea reiniciar todos los campos?', () => {
            inputIds.forEach((id) => {
                if ($(id)) {
                    $(id).dataset.raw = '';
                    $(id).value = formatMoney(0);
                }
            });
            if ($('companyName')) $('companyName').value = 'Agronare S.A. de C.V.';
            if ($('reportDate')) $('reportDate').valueAsDate = new Date();
            updateAll();
            showStatus('Formulario reiniciado.');
            setTimeout(hideStatus, 1400);
        });
    }

    /* ---------- Tabs accesibles ---------- */
    (function initAccessibleTabs() {
        const tabButtons = Array.from(document.querySelectorAll('[role="tab"]'));
        if (tabButtons.length === 0) return;

        function activateTab(tab) {
            tabButtons.forEach((b) => {
                const isActive = b === tab;
                b.setAttribute('aria-selected', isActive ? 'true' : 'false');
                b.tabIndex = isActive ? 0 : -1;
                if (isActive) b.classList.add('active');
                else b.classList.remove('active');
                const panelId = b.getAttribute('aria-controls');
                const panel = document.getElementById(panelId);
                if (panel) {
                    if (isActive) panel.classList.remove('hidden');
                    else panel.classList.add('hidden');
                }
            });
            tab.focus();
            if (tab.id && tab.id.includes('graficos')) {
                renderRatiosAndCharts(calculateAll());
            }
        }

        tabButtons.forEach((tab, index) => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                activateTab(tab);
            });
            tab.addEventListener('keydown', (e) => {
                const key = e.key;
                let newIndex = index;
                if (key === 'ArrowRight') newIndex = (index + 1) % tabButtons.length;
                else if (key === 'ArrowLeft') newIndex = (index - 1 + tabButtons.length) % tabButtons.length;
                else if (key === 'Home') newIndex = 0;
                else if (key === 'End') newIndex = tabButtons.length - 1;
                else return;
                e.preventDefault();
                activateTab(tabButtons[newIndex]);
            });
        });

        const initial = tabButtons.find((t) => t.getAttribute('aria-selected') === 'true') || tabButtons[0];
        if (initial) activateTab(initial);
    })();

    /* ---------- Inputs formateados ---------- */
    function attachCurrencyFormattingToInputs() {
        const inputs = Array.from(document.querySelectorAll('input.input-field'));

        const isNoCurrency = (el) => {
            if (!el) return false;
            if (el.classList.contains('no-currency')) return true;
            if (el.getAttribute('data-no-currency') === 'true') return true;
            if (el.closest && el.closest('[data-no-currency="true"]')) return true;
            return false;
        };

        inputs.forEach((inp) => {
            if (inp.dataset.currencyInit === '1') return;
            const skipCurrency = isNoCurrency(inp);

            try {
                inp.type = 'text';
            } catch { }

            if (!skipCurrency) {
                const parent = inp.parentElement;
                if (!parent || !parent.classList.contains('input-with-currency')) {
                    const wrapper = document.createElement('div');
                    wrapper.className = 'input-with-currency';
                    inp.replaceWith(wrapper);
                    wrapper.appendChild(inp);
                    const badge = document.createElement('span');
                    badge.className = 'currency-badge';
                    badge.setAttribute('aria-hidden', 'true');
                    badge.textContent = getCurrencySymbol(currencyCode());
                    wrapper.insertBefore(badge, inp);
                } else if (!parent.querySelector('.currency-badge')) {
                    const badge = document.createElement('span');
                    badge.className = 'currency-badge';
                    badge.setAttribute('aria-hidden', 'true');
                    badge.textContent = getCurrencySymbol(currencyCode());
                    parent.insertBefore(badge, inp);
                }
            } else {
                const maybeWrapper = inp.closest('.input-with-currency');
                if (maybeWrapper) {
                    maybeWrapper.classList.add('no-currency');
                    maybeWrapper.setAttribute('data-no-currency', 'true');
                }
            }

            if (!inp.dataset.raw || inp.dataset.raw === '') {
                const initialParsed = parseNumberFromFormatted(inp.value);
                inp.dataset.raw = Number.isFinite(initialParsed) ? initialParsed : '';
                inp.value = formatMoney(parseNumberFromFormatted(inp.dataset.raw || 0));
            } else {
                inp.value = formatMoney(parseNumberFromFormatted(inp.dataset.raw));
            }

            inp.addEventListener('focus', (e) => {
                const el = e.target;
                const raw = el.dataset.raw;
                el.value = raw || raw === 0 ? String(Number(raw)) : '';
                try {
                    el.setSelectionRange(el.value.length, el.value.length);
                } catch { }
            });

            inp.addEventListener('input', (e) => {
                const el = e.target;
                const parsed = parseNumberFromFormatted(el.value);
                if (!Number.isFinite(parsed) && el.value.trim() === '') {
                    el.dataset.raw = '';
                } else {
                    el.dataset.raw = parsed;
                }
            });

            inp.addEventListener('blur', (e) => {
                const el = e.target;
                const raw = parseNumberFromFormatted(el.dataset.raw || el.value);
                el.dataset.raw = raw;
                el.value = formatMoney(Number(raw || 0));
                updateAll(false);
            });

            inp.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    e.target.blur();
                }
            });

            inp.dataset.currencyInit = '1';
        });

        const curSel = document.getElementById('currencySelect');
        if (curSel && !curSel.dataset._hasBadgeListener) {
            curSel.addEventListener('change', () => {
                document.querySelectorAll('input.input-field').forEach((inp) => {
                    const raw = parseNumberFromFormatted(inp.dataset.raw || inp.value);
                    inp.value = formatMoney(raw);
                });
                const sym = getCurrencySymbol(currencyCode());
                document.querySelectorAll('.input-with-currency .currency-badge').forEach((b) => (b.textContent = sym));
            });
            curSel.dataset._hasBadgeListener = '1';
        }
    }

    /* ---------- Update all ---------- */
    function updateAll(saveLocal = true) {
        const data = calculateAll();
        renderBalance(data);
        renderResultados(data);
        renderFlujos(data);
        renderPatrimonio(data);
        const activeTab = document.querySelector('[role="tab"][aria-selected="true"]');
        if (activeTab && activeTab.id.includes('graficos')) renderRatiosAndCharts(data);
        if (saveLocal) saveToLocal(false);
    }

    /* ---------- Theme toggle ---------- */
    function setTheme(dark) {
        if (dark) {
            document.documentElement.classList.add('dark');
            if ($('btn-toggle-theme')) $('btn-toggle-theme').textContent = '☀️ Claro';
            if ($('btn-toggle-theme')) $('btn-toggle-theme').setAttribute('aria-pressed', 'true');
        } else {
            document.documentElement.classList.remove('dark');
            if ($('btn-toggle-theme')) $('btn-toggle-theme').textContent = '🌙 Oscuro';
            if ($('btn-toggle-theme')) $('btn-toggle-theme').setAttribute('aria-pressed', 'false');
        }
        localStorage.setItem(LS_KEY + '_theme', dark ? 'dark' : 'light');
    }

    /* ---------- Upload logo ---------- */
    function handleLogoFileUpload(file) {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const dataUrl = ev.target.result;
            companyLogoDataUrl = dataUrl;
            if ($('companyLogoImg')) $('companyLogoImg').src = dataUrl;
            showStatus('Logo cargado.');
            setTimeout(hideStatus, 1200);
        };
        reader.readAsDataURL(file);
    }

    /* ---------- Wiring ---------- */
    function bindEvents() {
        inputIds.forEach((id) => {
            const el = $(id);
            if (el) el.addEventListener('input', () => { });
        });
        if ($('companyName')) $('companyName').addEventListener('input', () => updateAll(false));
        if ($('reportDate')) $('reportDate').addEventListener('input', () => updateAll(false));
        if ($('currencySelect'))
            $('currencySelect').addEventListener('change', () => {
                document.querySelectorAll('input.input-field').forEach((inp) => {
                    const raw = parseNumberFromFormatted(inp.dataset.raw || inp.value);
                    inp.value = formatMoney(raw);
                });
                updateAll(false);
            });
        if ($('verticalAnalysisToggle'))
            $('verticalAnalysisToggle').addEventListener('change', () => updateAll(false));

        if ($('pdfScale'))
            $('pdfScale').addEventListener(
                'input',
                () => ($('pdfScaleVal').textContent = parseFloat($('pdfScale').value).toFixed(2))
            );
        if ($('pdfWatermarkOpacity'))
            $('pdfWatermarkOpacity').addEventListener(
                'input',
                () => ($('pdfWatermarkOpacityVal').textContent = parseFloat($('pdfWatermarkOpacity').value).toFixed(2))
            );
        if ($('pdfWatermarkSize'))
            $('pdfWatermarkSize').addEventListener(
                'input',
                () => ($('pdfWatermarkSizeVal').textContent = $('pdfWatermarkSize').value)
            );

        if ($('btn-preview')) $('btn-preview').addEventListener('click', () => updateAll(true));
        if ($('btn-save-local')) $('btn-save-local').addEventListener('click', () => saveToLocal(true));
        if ($('btn-clear-local')) $('btn-clear-local').addEventListener('click', clearLocal);
        if ($('btn-reset')) $('btn-reset').addEventListener('click', resetForm);
        if ($('btn-save-json')) $('btn-save-json').addEventListener('click', saveJsonFile);
        if ($('btn-load-json')) $('btn-load-json').addEventListener('click', () => $('file-load').click());
        if ($('file-load')) $('file-load').addEventListener('change', loadJsonFile);
        if ($('btn-export-xlsx')) $('btn-export-xlsx').addEventListener('click', exportXLSX);
        if ($('btn-export-pdf')) $('btn-export-pdf').addEventListener('click', exportPDFWithOptions);

        // -- NUEVO: Event listener para el análisis con IA --
        if ($('btn-gemini-analysis')) $('btn-gemini-analysis').addEventListener('click', generateFinancialAnalysis);

        if ($('btn-toggle-theme'))
            $('btn-toggle-theme').addEventListener('click', () => {
                const dark = document.documentElement.classList.toggle('dark');
                setTheme(dark);
            });

        if ($('companyLogoFile'))
            $('companyLogoFile').addEventListener('change', (e) => {
                const f = e.target.files[0];
                if (!f) return;
                handleLogoFileUpload(f);
                e.target.value = '';
            });

        if ($('companyLogoImg')) $('companyLogoImg').src = companyLogoDataUrl;
    }

    /* ---------- Inicialización ---------- */
    (function init() {
        if ($('reportDate')) $('reportDate').valueAsDate = new Date();
        attachCurrencyFormattingToInputs();
        const raw = localStorage.getItem(LS_KEY);
        if (raw) {
            try {
                applyForm(JSON.parse(raw));
            } catch {
                console.warn('Local data invalid');
            }
        }
        const theme = localStorage.getItem(LS_KEY + '_theme') || 'dark';
        setTheme(theme === 'dark');

        bindEvents();
        updateAll(false);
    })();
})();

/* ------------------ Registro único del Service Worker ------------------
   Evita dobles registros (tú también lo tenías en el HTML). Deja sólo este. */
if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
        try {
            // Usa el registro del scope raíz si ya existe
            const existing = await navigator.serviceWorker.getRegistration('/');
            if (!existing) {
                const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
                console.log('ServiceWorker registrado:', reg.scope);
            } else {
                console.log('ServiceWorker ya activo:', existing.scope);
            }
        } catch (err) {
            console.warn('ServiceWorker error:', err);
        }
    });
}
