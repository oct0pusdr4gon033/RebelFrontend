// ─────────────────────────────────────────────────────────────────────────────
// src/pages/Admin/Pagos/RegistrarPagoView.tsx
// Formulario de Solicitud y Corrección de Pagos de OC (Ejecutiva de Ventas / Master / Admin)
// Incluye:
// - Vencimiento de OC, Número de Cuenta Bancaria, Entidad Correspondiente,
//   Nombre del Titular de la Cuenta a la que van a depositar y Monto.
// - Validación 1: El monto no puede ser mayor a la Orden de Compra incluyendo los ajustes del flete.
// - Validación 2: Cuando se pide Flete, el monto no debe ser mayor a los montos del ajuste del flete.
// - Modo Corrección: Permite a la Ejecutiva corregir un Pago Rechazado viendo la justificación de la Administradora.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Swal from 'sweetalert2';
import { GoogleIcon } from '../../../components/GoogleIcon/GoogleIcon';
import { useAuth } from '../../../context/AuthContext';
import type { Oportunidad, ProductoItem } from '../../../types/oportunidades';
import type { ConceptoPago, MetodoPago, PagoOC } from '../../../types/pagos';
import {
  registrarPago,
  corregirSolicitudPago,
  obtenerPagos,
  calcularMontoAjusteFleteOC,
  pagoCuentaEnAcumulado,
  esPagoDeFlete,
} from '../../../api/services/pagos.service';
import { getConceptosPago } from '../../../api/services/conceptosPago.service';
import './Pagos.css';

interface RegistrarPagoViewProps {
  oportunidades: Oportunidad[];
  roleAccent?: string;
  preselectedOC?: string;
  pagoParaCorregir?: PagoOC | null;
  onPagoRegistrado?: (nuevoPago: PagoOC) => void;
  onCancelar?: () => void;
  ocultarVoucher?: boolean;
}

type TipoOperacionPago = 'proveedor' | 'transporte' | 'producto_individual' | 'otro';

const CONCEPTOS_BASE: { id: ConceptoPago; label: string; icon: string; desc: string; color: string }[] = [
  { id: 'Mercadería / Proveedor', label: 'Pago a Proveedor', icon: 'inventory_2', desc: 'Pago directo o abono a proveedor', color: '#2563eb' },
  { id: 'Flete', label: 'Pago a Transporte / Flete', icon: 'local_shipping', desc: 'Transporte, flete terrestre o aéreo', color: '#8b5cf6' },
  { id: 'Otro', label: 'Pago de Producto Individual a Proveedor', icon: 'widgets', desc: 'Pago por producto individual (precio negociado × cantidad)', color: '#059669' },
  { id: 'Comisión', label: 'Comisión Comercial', icon: 'handshake', desc: 'Comisión ejecutiva / intermediación', color: '#10b981' },
  { id: 'Gastos Varios', label: 'Gastos Varios', icon: 'receipt', desc: 'Embalaje, estiba, seguros, trámites', color: '#f59e0b' },
  { id: 'Adelanto', label: 'Adelanto / Anticipo', icon: 'payments', desc: 'Anticipo para compra de stock', color: '#06b6d4' },
  { id: 'Liquidación Final', label: 'Liquidación Final', icon: 'task_alt', desc: 'Cierre total de la orden de compra', color: '#ec4899' },
];

const METODOS: MetodoPago[] = [
  'Transferencia Bancaria',
  'Depósito en Cuenta',
  'Yape / Plin',
  'Cheque de Gerencia',
  'Tarjeta de Crédito / Débito',
  'Efectivo',
];

const ENTIDADES_BANCARIAS = [
  'BCP (Banco de Crédito del Perú)',
  'BBVA',
  'Interbank',
  'Scotiabank',
  'Banco de la Nación',
  'BanBif',
  'Banco Pichincha',
  'Yape / Plin',
  'Caja Municipal / Otro',
];

export const RegistrarPagoView: React.FC<RegistrarPagoViewProps> = ({
  oportunidades,
  roleAccent = '#2563eb',
  preselectedOC,
  pagoParaCorregir = null,
  onPagoRegistrado,
  onCancelar,
}) => {
  const { empleado } = useAuth();
  const esModoCorreccion = Boolean(pagoParaCorregir);

  // Lista de oportunidades elegibles para solicitar pagos
  const oportunidadesDisponibles = useMemo(() => {
    return oportunidades.filter((op) => op.estado !== 'Desestimada');
  }, [oportunidades]);

  // Función para normalizar y resolver el identificador de OC compatible con el selector
  const resolverClaveOC = useCallback(
    (target?: string): string => {
      if (!target) return '';
      const clean = target.trim().toLowerCase();
      const match = oportunidadesDisponibles.find((op) => {
        const ocNum = (op.ordenCompra?.numeroOC || '').trim().toLowerCase();
        const ocamNum = (op.ordenCompra?.nroOCAM || '').trim().toLowerCase();
        const req = (op.numeroRequerimiento || '').trim().toLowerCase();
        const reqPrefixed = `oc-req-${req}`;
        return (
          ocNum === clean ||
          ocamNum === clean ||
          req === clean ||
          reqPrefixed === clean ||
          String(op.id) === clean
        );
      });
      if (match) {
        return match.ordenCompra?.numeroOC || `OC-REQ-${match.numeroRequerimiento}`;
      }
      return target;
    },
    [oportunidadesDisponibles]
  );

  // Selección de OC / Requerimiento
  const [selectedOCNum, setSelectedOCNum] = useState<string>(() => {
    if (pagoParaCorregir?.numeroOC) return resolverClaveOC(pagoParaCorregir.numeroOC);
    if (preselectedOC) return resolverClaveOC(preselectedOC);
    const conOC = oportunidadesDisponibles.find((o) => o.ordenCompra?.numeroOC || o.ordenCompra?.nroOCAM);
    if (conOC?.ordenCompra?.numeroOC) return conOC.ordenCompra.numeroOC;
    return (
      oportunidadesDisponibles[0]?.ordenCompra?.numeroOC ||
      (oportunidadesDisponibles[0] ? `OC-REQ-${oportunidadesDisponibles[0].numeroRequerimiento}` : '')
    );
  });

  useEffect(() => {
    if (pagoParaCorregir?.numeroOC) {
      setSelectedOCNum(resolverClaveOC(pagoParaCorregir.numeroOC));
    } else if (preselectedOC) {
      setSelectedOCNum(resolverClaveOC(preselectedOC));
    }
  }, [preselectedOC, pagoParaCorregir, resolverClaveOC]);

  const oportunidadSeleccionada = useMemo(() => {
    if (!selectedOCNum) return undefined;
    const clean = selectedOCNum.trim().toLowerCase();
    return oportunidadesDisponibles.find((op) => {
      const ocNum = (op.ordenCompra?.numeroOC || `OC-REQ-${op.numeroRequerimiento}`).trim().toLowerCase();
      const realOc = (op.ordenCompra?.numeroOC || '').trim().toLowerCase();
      const ocamNum = (op.ordenCompra?.nroOCAM || '').trim().toLowerCase();
      const req = (op.numeroRequerimiento || '').trim().toLowerCase();
      const reqPrefixed = `oc-req-${req}`;
      return (
        ocNum === clean ||
        realOc === clean ||
        ocamNum === clean ||
        req === clean ||
        reqPrefixed === clean ||
        String(op.id) === clean
      );
    });
  }, [oportunidadesDisponibles, selectedOCNum]);

  // ── VERIFICAR SI TIENE LA OCAM HABILITADA ──
  const tieneOCAMHabilitada = useMemo(() => {
    if (esModoCorreccion) return true;
    if (!oportunidadSeleccionada) return false;
    const oc = oportunidadSeleccionada.ordenCompra;
    if (!oc) return false;

    const tieneDatosObligatorios = Boolean(
      oc.nroOCAM && oc.nroOCAM.trim() && oc.nroExpediente && oc.nroExpediente.trim()
    );

    const tieneOCValidaRegistrada = Boolean(
      oc.numeroOC && oc.numeroOC.trim() && oc.montoOCAM && oc.montoOCAM > 0
    );

    const estadoAvanzado =
      oportunidadSeleccionada.estado === 'Cotización' ||
      oportunidadSeleccionada.estado === 'Adjudicada' ||
      ['OC_RECIBIDA', 'OC_ACEPTADA', 'ENTREGADA'].includes(oportunidadSeleccionada.estado);

    const tieneDocumentoOFolio = Boolean(
      (oc.nroFolio && oc.nroFolio.trim()) || (oc.archivoOCUrl && oc.archivoOCUrl.trim())
    );

    return (
      (tieneDatosObligatorios && (estadoAvanzado || tieneDocumentoOFolio)) ||
      (tieneOCValidaRegistrada && (estadoAvanzado || tieneDocumentoOFolio))
    );
  }, [oportunidadSeleccionada, esModoCorreccion]);

  // Historial de pagos previos de la OC (excluyendo rechazados/anulados y el propio pago en corrección)
  const pagosPreviosOC = useMemo(() => {
    if (!oportunidadSeleccionada && !selectedOCNum) return [];
    const todos = obtenerPagos();
    const opId = oportunidadSeleccionada?.id;
    const opReq = oportunidadSeleccionada?.numeroRequerimiento?.trim().toLowerCase();
    const opOC = oportunidadSeleccionada?.ordenCompra?.numeroOC?.trim().toLowerCase();
    const opOCAM = oportunidadSeleccionada?.ordenCompra?.nroOCAM?.trim().toLowerCase();
    const target = selectedOCNum.trim().toLowerCase();

    return todos.filter((p) => {
      if (pagoParaCorregir && String(p.id) === String(pagoParaCorregir.id)) return false;
      if (!pagoCuentaEnAcumulado(p.estado)) return false;

      if (opId && p.oportunidadId && Number(p.oportunidadId) === Number(opId)) return true;
      const pOC = p.numeroOC?.trim().toLowerCase();
      const pReq = p.numeroRequerimiento?.trim().toLowerCase();
      return (
        (pOC && (pOC === target || pOC === opOC || pOC === opOCAM)) ||
        (opReq && pReq && pReq === opReq)
      );
    });
  }, [oportunidadSeleccionada, selectedOCNum, pagoParaCorregir]);

  const totalAcumuladoPrevio = useMemo(() => {
    return pagosPreviosOC.reduce((sum, p) => sum + (p.moneda === 'PEN' ? p.monto : 0), 0);
  }, [pagosPreviosOC]);

  const fleteAcumuladoPrevio = useMemo(() => {
    return pagosPreviosOC
      .filter((p) => p.moneda === 'PEN' && esPagoDeFlete(p.concepto, p.conceptoPersonalizado))
      .reduce((sum, p) => sum + p.monto, 0);
  }, [pagosPreviosOC]);

  // Monto base de la Orden de Compra (sin ajustes)
  const montoBaseOC = useMemo(() => {
    if (!oportunidadSeleccionada) return 0;
    if (
      oportunidadSeleccionada.ordenCompra?.montoOCAM != null &&
      oportunidadSeleccionada.ordenCompra.montoOCAM > 0
    ) {
      return Number(oportunidadSeleccionada.ordenCompra.montoOCAM);
    }
    return Number(oportunidadSeleccionada.limiteTotal) || 0;
  }, [oportunidadSeleccionada]);

  // Ajuste de flete calculado de los ítems de la OC o de pagos previos
  const ajusteFleteDetectadoOC = useMemo(() => {
    const previoGuardado =
      pagoParaCorregir?.montoAjusteFlete ??
      pagosPreviosOC.find((p) => (p.montoAjusteFlete || 0) > 0)?.montoAjusteFlete;
    return calcularMontoAjusteFleteOC(oportunidadSeleccionada, previoGuardado);
  }, [oportunidadSeleccionada, pagosPreviosOC, pagoParaCorregir]);

  // Estado editable para el Monto de Ajustes del Flete de la OC (permite usar el detectado o indicarlo si la OC tuvo ajuste)
  const [montoAjusteFleteInput, setMontoAjusteFleteInput] = useState<string>('');

  useEffect(() => {
    setMontoAjusteFleteInput(ajusteFleteDetectadoOC > 0 ? ajusteFleteDetectadoOC.toFixed(2) : '0.00');
  }, [ajusteFleteDetectadoOC, selectedOCNum]);

  const montoAjusteFleteOC = useMemo(() => {
    const parsed = parseFloat(montoAjusteFleteInput);
    if (!isNaN(parsed) && parsed >= 0) return parsed;
    return ajusteFleteDetectadoOC;
  }, [montoAjusteFleteInput, ajusteFleteDetectadoOC]);

  // Flete fijo registrado en la Orden de Compra (campo del seguimiento)
  const fleteFijoOC = Number(oportunidadSeleccionada?.ordenCompra?.flete || 0);

  // TECHO TOTAL = Monto Orden de Compra + Flete de la OC + Ajustes del Flete
  const montoTechoTotalConAjustes = useMemo(() => {
    return Number((montoBaseOC + fleteFijoOC + montoAjusteFleteOC).toFixed(2));
  }, [montoBaseOC, fleteFijoOC, montoAjusteFleteOC]);

  // Conceptos dinámicos
  const [conceptosList, setConceptosList] = useState(CONCEPTOS_BASE);

  useEffect(() => {
    getConceptosPago(true)
      .then((data) => {
        if (data && data.length > 0) {
          const mapeados = data.map((d) => ({
            id: (d.codigo as ConceptoPago) || (d.nombre as ConceptoPago),
            label: d.nombre,
            icon: d.icono || 'receipt',
            desc: d.descripcion || '',
            color: d.color || '#2563eb',
          }));
          setConceptosList(mapeados);
        }
      })
      .catch(() => {
        // Fallback a CONCEPTOS_BASE
      });
  }, []);

  // ── MODO DE OPERACIÓN DE PAGO ──
  const [tipoOperacion, setTipoOperacion] = useState<TipoOperacionPago>('proveedor');
  const [concepto, setConcepto] = useState<ConceptoPago>('Mercadería / Proveedor');
  const [conceptoPersonalizado, setConceptoPersonalizado] = useState('');

  // ── CAMPOS DE PAGO DE PRODUCTO INDIVIDUAL A PROVEEDOR ──
  const [productoSeleccionadoId, setProductoSeleccionadoId] = useState<string | number>('');
  const [precioUnitarioIndividual, setPrecioUnitarioIndividual] = useState<string>('');
  const [cantidadIndividual, setCantidadIndividual] = useState<string>('1');

  const productoSeleccionado: ProductoItem | undefined = useMemo(() => {
    if (!oportunidadSeleccionada?.items) return undefined;
    if (productoSeleccionadoId) {
      return oportunidadSeleccionada.items.find((it) => String(it.id) === String(productoSeleccionadoId));
    }
    return oportunidadSeleccionada.items[0];
  }, [oportunidadSeleccionada, productoSeleccionadoId]);

  useEffect(() => {
    if (oportunidadSeleccionada?.items && oportunidadSeleccionada.items.length > 0) {
      const primerItem = oportunidadSeleccionada.items[0];
      setProductoSeleccionadoId(primerItem.id);
      setCantidadIndividual(String(primerItem.cantidad || 1));

      const precioPactado =
        primerItem.proveedores?.[0]?.costoUnitario ??
        primerItem.precioUnitarioBase ??
        primerItem.limiteUnitario ??
        0;
      setPrecioUnitarioIndividual(precioPactado > 0 ? String(precioPactado) : '');
    }
  }, [oportunidadSeleccionada]);

  const precioNegociadoAnterior = useMemo(() => {
    if (!productoSeleccionado) return 0;
    return (
      productoSeleccionado.proveedores?.[0]?.costoUnitario ??
      productoSeleccionado.precioUnitarioBase ??
      productoSeleccionado.limiteUnitario ??
      0
    );
  }, [productoSeleccionado]);

  const handleCambiarTipoOperacion = (tipo: TipoOperacionPago) => {
    setTipoOperacion(tipo);
    if (tipo === 'proveedor') {
      setConcepto('Mercadería / Proveedor');
      setConceptoPersonalizado('Pago a Proveedor');
    } else if (tipo === 'transporte') {
      setConcepto('Flete');
      setConceptoPersonalizado('Pago a Transporte / Flete');
    } else if (tipo === 'producto_individual') {
      setConcepto('Mercadería / Proveedor');
      if (productoSeleccionado) {
        setConceptoPersonalizado(
          `Pago Producto Individual: ${productoSeleccionado.descripcion || productoSeleccionado.numeroParte}`
        );
      }
    } else {
      setConcepto('Otro');
      setConceptoPersonalizado('');
    }
  };

  // ── CAMPOS REQUERIDOS PARA LA SOLICITUD DE LA EJECUTIVA DE VENTAS ──
  // 1. Vencimiento de OC
  // 2. Número de Cuenta Bancaria
  // 3. Entidad Correspondiente
  // 4. Nombre del Titular de la Cuenta a la que van a depositar
  // 5. Monto
  const [fechaVencimientoOC, setFechaVencimientoOC] = useState<string>('');
  const [entidadCorrespondiente, setEntidadCorrespondiente] = useState<string>('BCP (Banco de Crédito del Perú)');
  const [numeroCuentaBancaria, setNumeroCuentaBancaria] = useState<string>('');
  const [titularCuenta, setTitularCuenta] = useState<string>('');
  const [monto, setMonto] = useState<string>('');
  const [moneda, setMoneda] = useState<'PEN' | 'USD'>('PEN');
  const [fechaPago, setFechaPago] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('Transferencia Bancaria');
  const [notas, setNotas] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Autocompletar Vencimiento de OC desde la Orden de Compra seleccionada si existe
  useEffect(() => {
    if (pagoParaCorregir?.fechaVencimientoOC) {
      setFechaVencimientoOC(pagoParaCorregir.fechaVencimientoOC.slice(0, 10));
      return;
    }
    const fEntrega =
      oportunidadSeleccionada?.ordenCompra?.fechaEntrega?.slice(0, 10) ||
      oportunidadSeleccionada?.anuncioograma?.slice(0, 10) ||
      '';
    if (fEntrega) {
      setFechaVencimientoOC(fEntrega);
    }
  }, [oportunidadSeleccionada, pagoParaCorregir]);

  // Pre-cargar datos si estamos corrigiendo un Pago Rechazado
  useEffect(() => {
    if (!pagoParaCorregir) return;
    if (esPagoDeFlete(pagoParaCorregir.concepto, pagoParaCorregir.conceptoPersonalizado)) {
      setTipoOperacion('transporte');
      setConcepto('Flete');
    } else {
      setTipoOperacion('proveedor');
      setConcepto(pagoParaCorregir.concepto || 'Mercadería / Proveedor');
    }
    setConceptoPersonalizado(pagoParaCorregir.conceptoPersonalizado || '');
    setFechaVencimientoOC(pagoParaCorregir.fechaVencimientoOC?.slice(0, 10) || '');
    setEntidadCorrespondiente(
      pagoParaCorregir.entidadCorrespondiente || pagoParaCorregir.banco || 'BCP (Banco de Crédito del Perú)'
    );
    setNumeroCuentaBancaria(pagoParaCorregir.numeroCuentaBancaria || '');
    setTitularCuenta(pagoParaCorregir.titularCuenta || pagoParaCorregir.beneficiario || '');
    setMonto(String(pagoParaCorregir.monto || ''));
    setMoneda(pagoParaCorregir.moneda || 'PEN');
    setFechaPago(pagoParaCorregir.fechaPago?.slice(0, 10) || new Date().toISOString().slice(0, 10));
    setMetodoPago(pagoParaCorregir.metodoPago || 'Transferencia Bancaria');
    setNotas(pagoParaCorregir.notas || '');
  }, [pagoParaCorregir]);

  // Sincronización automática de monto cuando es producto individual
  useEffect(() => {
    if (tipoOperacion === 'producto_individual') {
      const pUnit = parseFloat(precioUnitarioIndividual) || 0;
      const cant = parseFloat(cantidadIndividual) || 0;
      const subtotal = pUnit * cant;
      setMonto(subtotal > 0 ? subtotal.toFixed(2) : '');
    }
  }, [tipoOperacion, precioUnitarioIndividual, cantidadIndividual]);

  // ── VALIDACIÓN PRECIO UNITARIO INDIVIDUAL <= PRECIO NEGOCIADO ANTERIOR ──
  const precioExcedeNegociado = useMemo(() => {
    if (tipoOperacion !== 'producto_individual') return false;
    const pUnit = parseFloat(precioUnitarioIndividual) || 0;
    if (precioNegociadoAnterior <= 0) return false;
    return pUnit > precioNegociadoAnterior + 0.001;
  }, [tipoOperacion, precioUnitarioIndividual, precioNegociadoAnterior]);

  // ── VALIDACIÓN 1: MONTO NO PUEDE SER MAYOR A LA ORDEN DE COMPRA INCLUYENDO LOS AJUSTES DEL FLETE ──
  const montoActualNum = parseFloat(monto) || 0;
  const totalProyectado = totalAcumuladoPrevio + montoActualNum;
  const saldoDisponibleTotal = Math.max(0, montoTechoTotalConAjustes - totalAcumuladoPrevio);
  // El importe debe ser ESTRICTAMENTE MENOR al saldo pendiente de la OC.
  const excedeTechoOCConAjustes =
    moneda === 'PEN' &&
    montoTechoTotalConAjustes > 0 &&
    montoActualNum > 0 &&
    totalProyectado >= montoTechoTotalConAjustes - 0.005;

  // ── VALIDACIÓN 2: CUANDO SE PIDE FLETE, NO DEBE SER MAYOR A LOS MONTOS DEL AJUSTE DEL FLETE ──
  const esSolicitudFlete =
    tipoOperacion === 'transporte' || esPagoDeFlete(concepto, conceptoPersonalizado);
  const fleteProyectado = fleteAcumuladoPrevio + (esSolicitudFlete ? montoActualNum : 0);
  const saldoDisponibleFlete = Math.max(0, montoAjusteFleteOC - fleteAcumuladoPrevio);
  const excedeAjusteFlete =
    moneda === 'PEN' &&
    esSolicitudFlete &&
    montoActualNum > 0 &&
    (montoAjusteFleteOC <= 0 || fleteProyectado > montoAjusteFleteOC + 0.01);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!tieneOCAMHabilitada) {
      Swal.fire({
        icon: 'error',
        title: 'Solicitud Bloqueada',
        html: `Esta oportunidad aún no tiene la <strong>Orden de Compra oficial de Perú Compras (OCAM)</strong> registrada.<br/><br/>Primero sube la OCAM para habilitar las solicitudes de pago.`,
        confirmButtonColor: '#dc2626',
      });
      return;
    }

    if (!selectedOCNum) {
      Swal.fire({
        icon: 'warning',
        title: 'Orden de Compra requerida',
        text: 'Debes seleccionar una Orden de Compra para vincular la solicitud de pago.',
        confirmButtonColor: roleAccent,
      });
      return;
    }

    if (!fechaVencimientoOC) {
      Swal.fire({
        icon: 'warning',
        title: 'Vencimiento de OC requerido',
        text: 'Por favor indica la fecha de Vencimiento de la OC.',
        confirmButtonColor: roleAccent,
      });
      return;
    }

    if (!entidadCorrespondiente.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Entidad Correspondiente requerida',
        text: 'Indica la entidad bancaria correspondiente para el depósito.',
        confirmButtonColor: roleAccent,
      });
      return;
    }

    if (!numeroCuentaBancaria.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Número de Cuenta Bancaria requerido',
        text: 'Ingresa el número de cuenta bancaria o CCI de la entidad a la que se va a depositar.',
        confirmButtonColor: roleAccent,
      });
      return;
    }

    if (!titularCuenta.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Nombre del Titular requerido',
        text: 'Ingresa el nombre del titular de la cuenta a la que van a depositar.',
        confirmButtonColor: roleAccent,
      });
      return;
    }

    if (tipoOperacion === 'producto_individual') {
      const pUnit = parseFloat(precioUnitarioIndividual) || 0;
      if (pUnit <= 0) {
        Swal.fire({
          icon: 'warning',
          title: 'Precio Unitario requerido',
          text: 'Ingresa un precio unitario mayor a S/ 0.00.',
          confirmButtonColor: roleAccent,
        });
        return;
      }
      if (precioExcedeNegociado) {
        Swal.fire({
          icon: 'error',
          title: 'Precio Excede lo Negociado',
          html: `El precio unitario ingresado (<strong>S/ ${pUnit.toFixed(2)}</strong>) <strong>NO DEBE SER MAYOR</strong> al precio negociado anteriormente (<strong>S/ ${precioNegociadoAnterior.toFixed(2)}</strong>).`,
          confirmButtonColor: '#dc2626',
        });
        return;
      }
    }

    const valorMonto = parseFloat(monto);
    if (isNaN(valorMonto) || valorMonto <= 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Monto inválido',
        text: 'Ingresa un monto numérico mayor a 0.',
        confirmButtonColor: roleAccent,
      });
      return;
    }

    // Validación Flete vs Ajuste del Flete
    if (excedeAjusteFlete) {
      Swal.fire({
        icon: 'error',
        title: 'Monto de Flete Excede el Ajuste de Flete',
        html: `
          <div style="text-align: left; font-size: 13px; line-height: 1.5;">
            <p>Cuando se solicita pago por concepto de <strong>Flete</strong>, el monto <strong>NO DEBE SER MAYOR</strong> a los montos del ajuste del flete de la OC:</p>
            <ul style="margin: 8px 0; padding-left: 20px;">
              <li>Monto del Ajuste de Flete de la OC: <strong>S/ ${montoAjusteFleteOC.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</strong></li>
              <li>Flete solicitado previamente: <strong>S/ ${fleteAcumuladoPrevio.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</strong></li>
              <li>Nuevo monto de flete solicitado: <strong>S/ ${valorMonto.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</strong></li>
              <li style="color: #dc2626;">Saldo máximo disponible para Flete: <strong>S/ ${saldoDisponibleFlete.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</strong></li>
            </ul>
          </div>
        `,
        confirmButtonColor: '#dc2626',
      });
      return;
    }

    // Validación Monto vs Orden de Compra + Flete + Ajustes del Flete
    if (excedeTechoOCConAjustes) {
      Swal.fire({
        icon: 'error',
        title: 'El importe debe ser menor al saldo pendiente',
        html: `
          <div style="text-align: left; font-size: 13px; line-height: 1.5;">
            <p>El importe de la solicitud debe ser <strong>ESTRICTAMENTE MENOR</strong> al saldo pendiente de la Orden de Compra:</p>
            <ul style="margin: 8px 0; padding-left: 20px;">
              <li>Monto Orden de Compra (Base): <strong>S/ ${montoBaseOC.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</strong></li>
              <li>Flete de la OC: <strong>+ S/ ${fleteFijoOC.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</strong></li>
              <li>Ajustes del Flete: <strong>+ S/ ${montoAjusteFleteOC.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</strong></li>
              <li>Techo Total (OC + Flete + Ajustes): <strong>S/ ${montoTechoTotalConAjustes.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</strong></li>
              <li>Pagos acumulados previos: <strong>S/ ${totalAcumuladoPrevio.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</strong></li>
              <li style="color: #dc2626;">Saldo pendiente: <strong>S/ ${saldoDisponibleTotal.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</strong></li>
            </ul>
            <p>El nuevo importe (<strong>S/ ${valorMonto.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</strong>) debe ser menor a ese saldo.</p>
          </div>
        `,
        confirmButtonColor: '#dc2626',
      });
      return;
    }

    let detalleConceptoFinal = conceptoPersonalizado.trim();
    if (tipoOperacion === 'producto_individual' && productoSeleccionado) {
      detalleConceptoFinal = `Pago Producto Individual: ${productoSeleccionado.descripcion || productoSeleccionado.numeroParte} (${cantidadIndividual} unids × S/ ${parseFloat(precioUnitarioIndividual).toFixed(2)})`;
    } else if (tipoOperacion === 'proveedor') {
      detalleConceptoFinal = detalleConceptoFinal || 'Pago a Proveedor de Mercadería';
    } else if (tipoOperacion === 'transporte') {
      detalleConceptoFinal = detalleConceptoFinal || 'Pago a Transporte y Flete';
    }

    setIsSubmitting(true);
    try {
      let resultado: PagoOC;

      if (esModoCorreccion && pagoParaCorregir) {
        resultado = await corregirSolicitudPago(
          pagoParaCorregir.id,
          {
            fechaVencimientoOC,
            numeroCuentaBancaria: numeroCuentaBancaria.trim(),
            entidadCorrespondiente: entidadCorrespondiente.trim(),
            titularCuenta: titularCuenta.trim(),
            concepto,
            conceptoPersonalizado: detalleConceptoFinal,
            monto: valorMonto,
            montoAjusteFlete: montoAjusteFleteOC,
            moneda,
            fechaPago,
            metodoPago,
            notas: notas.trim(),
          },
          oportunidadSeleccionada
        );

        await Swal.fire({
          icon: 'success',
          title: '¡Solicitud Corregida y Reenviada a Revisión!',
          html: `
            <div style="text-align: left; font-size: 13px;">
              <p>El pago <strong>${resultado.codigoPago}</strong> ha sido corregido y enviado nuevamente a estado <strong>En Revisión</strong> para la Administradora.</p>
              <p>Entidad: <strong>${entidadCorrespondiente}</strong> · Cuenta: <strong>${numeroCuentaBancaria}</strong></p>
              <p>Titular: <strong>${titularCuenta}</strong> · Monto: <strong>${moneda === 'PEN' ? 'S/' : '$'} ${valorMonto.toFixed(2)}</strong></p>
            </div>
          `,
          confirmButtonColor: '#059669',
        });
      } else {
        resultado = await registrarPago(
          {
            oportunidadId: oportunidadSeleccionada ? Number(oportunidadSeleccionada.id) : 0,
            ordenCompraId: oportunidadSeleccionada?.ordenCompra?.id,
            numeroOC: selectedOCNum,
            numeroRequerimiento: oportunidadSeleccionada?.numeroRequerimiento || '',
            empresaRazonSocial:
              oportunidadSeleccionada?.empresaRazonSocial ||
              oportunidadSeleccionada?.entidadConvocante ||
              'Entidad Convocante',
            entidadConvocante: oportunidadSeleccionada?.entidadConvocante,
            concepto,
            conceptoPersonalizado: detalleConceptoFinal,
            monto: valorMonto,
            montoAjusteFlete: montoAjusteFleteOC,
            moneda,
            fechaPago,
            fechaVencimientoOC,
            metodoPago,
            banco: entidadCorrespondiente.trim(),
            entidadCorrespondiente: entidadCorrespondiente.trim(),
            numeroCuentaBancaria: numeroCuentaBancaria.trim(),
            titularCuenta: titularCuenta.trim(),
            beneficiario: titularCuenta.trim(),
            notas: [
              tipoOperacion === 'producto_individual'
                ? `[Producto: ${productoSeleccionado?.numeroParte || ''} | Cant: ${cantidadIndividual} | P.Unit: S/ ${precioUnitarioIndividual} | P.Negociado: S/ ${precioNegociadoAnterior.toFixed(2)}]`
                : '',
              notas.trim(),
            ]
              .filter(Boolean)
              .join(' - '),
            archivoComprobante: null,
          },
          {
            nombreCompleto:
              empleado?.nombreCompleto ||
              `${empleado?.nombres ?? ''} ${empleado?.apellidos ?? ''}`.trim() ||
              'Ejecutiva de Ventas',
            email: empleado?.email || 'ventas@rebelqueen.com',
          },
          oportunidadSeleccionada
        );

        await Swal.fire({
          icon: 'success',
          title: '¡Solicitud de Pago Enviada a Administración!',
          html: `
            <div style="text-align: left; font-size: 13px; line-height: 1.5;">
              <p>Se registró la solicitud <strong>${resultado.codigoPago}</strong> en estado <strong>En Revisión</strong> para la OC <strong>${resultado.numeroOC}</strong>.</p>
              <ul style="margin: 8px 0; padding-left: 18px;">
                <li>Vencimiento de OC: <strong>${fechaVencimientoOC}</strong></li>
                <li>Entidad Correspondiente: <strong>${entidadCorrespondiente}</strong></li>
                <li>N° Cuenta Bancaria: <strong>${numeroCuentaBancaria}</strong></li>
                <li>Titular de la Cuenta: <strong>${titularCuenta}</strong></li>
                <li>Monto Solicitado: <strong>${moneda === 'PEN' ? 'S/' : '$'} ${valorMonto.toFixed(2)}</strong> (${detalleConceptoFinal})</li>
              </ul>
              <p style="color: #059669; font-weight: 600;">La Administradora completará el N° de Operación, la Hora y adjuntará la Evidencia del Pago.</p>
            </div>
          `,
          confirmButtonColor: '#059669',
        });
      }

      setMonto('');
      setNumeroCuentaBancaria('');
      setTitularCuenta('');
      setNotas('');

      if (onPagoRegistrado) {
        onPagoRegistrado(resultado);
      }
    } catch (err: any) {
      console.error(err);
      Swal.fire({
        icon: 'error',
        title: 'No se pudo procesar la solicitud',
        text: err?.message || 'Verifica los datos e intenta nuevamente.',
        confirmButtonColor: '#dc2626',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formularioBloqueado =
    isSubmitting ||
    !tieneOCAMHabilitada ||
    precioExcedeNegociado ||
    excedeTechoOCConAjustes ||
    excedeAjusteFlete;

  return (
    <div className="pagos-form-container" style={{ borderRadius: 0 }}>
      {/* Header del formulario */}
      <div className="pagos-form-header" style={{ borderRadius: 0 }}>
        <div className="pagos-form-header__title">
          <div
            className="pagos-form-header__icon"
            style={{ background: `${roleAccent}15`, color: roleAccent, borderRadius: 0 }}
          >
            <GoogleIcon name={esModoCorreccion ? 'edit_note' : 'add_card'} size={24} color={roleAccent} />
          </div>
          <div>
            <h2>
              {esModoCorreccion
                ? `Corregir Solicitud de Pago Rechazado · ${pagoParaCorregir?.codigoPago}`
                : 'Solicitar Pago de Orden de Compra (Seguimiento de OC)'}
            </h2>
            <p>
              Como <strong>Ejecutiva de Ventas</strong>, indica el <strong>Vencimiento de OC</strong>,{' '}
              <strong>Número de Cuenta Bancaria</strong>, <strong>Entidad Correspondiente</strong>,{' '}
              <strong>Nombre del Titular de la Cuenta</strong> y <strong>Monto</strong> para que Administración procese el desembolso.
            </p>
          </div>
        </div>
        {onCancelar && (
          <button
            type="button"
            className="pagos-btn pagos-btn--outline"
            onClick={onCancelar}
            style={{ borderRadius: 0 }}
          >
            <GoogleIcon name="arrow_back" size={18} />
            <span>Volver al Historial</span>
          </button>
        )}
      </div>

      {/* BANNER DE JUSTIFICACIÓN DE CORRECCIÓN CUANDO EL PAGO FUE RECHAZADO POR LA ADMINISTRADORA */}
      {esModoCorreccion && pagoParaCorregir?.justificacionCorreccion && (
        <div
          style={{
            background: '#fef2f2',
            border: '2px solid #dc2626',
            padding: '16px 20px',
            marginBottom: '18px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '14px',
          }}
        >
          <div
            style={{
              background: '#fee2e2',
              padding: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <GoogleIcon name="report_problem" size={26} color="#dc2626" />
          </div>
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: '13.5px',
                fontWeight: 800,
                color: '#991b1b',
                textTransform: 'uppercase',
                letterSpacing: '0.3px',
              }}
            >
              Pago Observado / Rechazado por Administradora ({pagoParaCorregir.resueltoPorAdmin || 'Administración'})
            </div>
            <div style={{ fontSize: '13px', color: '#7f1d1d', marginTop: 4, lineHeight: 1.5 }}>
              <strong>Justificación de Corrección:</strong> "{pagoParaCorregir.justificacionCorreccion}"
            </div>
            <div style={{ fontSize: '11.5px', color: '#991b1b', marginTop: 6, fontWeight: 600 }}>
              Corrige los datos solicitados abajo y presiona <strong>"Guardar Corrección y Reenviar a Revisión"</strong>.
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="pagos-form">
        {/* PASO 1: Selección de Orden de Compra, Vencimiento de OC y Techo (OC + Ajustes de Flete) */}
        <section className="pagos-card" style={{ borderRadius: 0 }}>
          <div className="pagos-card__header">
            <span
              className="pagos-card__badge"
              style={{ background: `${roleAccent}1a`, color: roleAccent, borderRadius: 0 }}
            >
              Paso 1
            </span>
            <div className="pagos-card__titles">
              <h3>Orden de Compra, Vencimiento de OC y Techo Presupuestal (OC + Ajustes del Flete)</h3>
              <p>Selecciona tu Orden de Compra e indica su fecha de vencimiento para el seguimiento del pago</p>
            </div>
          </div>

          <div className="pagos-card__body">
            <div className="pagos-row-2">
              <div className="pagos-form-group">
                <label htmlFor="select-oc" className="pagos-label">
                  Orden de Compra / Requerimiento <span className="req">*</span>
                </label>
                <select
                  id="select-oc"
                  className="pagos-select"
                  value={selectedOCNum}
                  onChange={(e) => setSelectedOCNum(e.target.value)}
                  disabled={esModoCorreccion}
                  style={{ borderRadius: 0 }}
                  required
                >
                  <option value="">-- Selecciona una Orden de Compra / Requerimiento --</option>
                  {oportunidadesDisponibles.map((op) => {
                    const ocNum = op.ordenCompra?.numeroOC || `OC-REQ-${op.numeroRequerimiento}`;
                    const tieneOCAM = op.ordenCompra?.nroOCAM && op.ordenCompra?.nroExpediente;
                    return (
                      <option key={op.id} value={ocNum}>
                        {tieneOCAM ? '✓ [OCAM OK]' : '🔒 [Falta OCAM]'} {op.ordenCompra?.nroOCAM || ocNum} · RQ:{' '}
                        {op.numeroRequerimiento} · {op.empresaRazonSocial || op.entidadConvocante || 'Entidad'} (
                        {op.estado})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="pagos-form-group">
                <label htmlFor="vencimiento-oc-input" className="pagos-label">
                  Vencimiento de OC <span className="req">*</span>
                </label>
                <input
                  id="vencimiento-oc-input"
                  type="date"
                  className="pagos-input"
                  value={fechaVencimientoOC}
                  onChange={(e) => setFechaVencimientoOC(e.target.value)}
                  disabled={!tieneOCAMHabilitada}
                  style={{ borderRadius: 0 }}
                  required
                />
              </div>
            </div>

            {/* BANNER DE BLOQUEO SI NO TIENE OCAM OFICIAL SUBIDA */}
            {oportunidadSeleccionada && !tieneOCAMHabilitada && (
              <div
                style={{
                  background: '#fef2f2',
                  border: '1.5px solid #f87171',
                  borderRadius: 0,
                  padding: 16,
                  marginTop: 12,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                }}
              >
                <div
                  style={{
                    background: '#fee2e2',
                    padding: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <GoogleIcon name="lock" size={26} color="#dc2626" />
                </div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: '13.5px',
                      fontWeight: 800,
                      color: '#991b1b',
                      textTransform: 'uppercase',
                      letterSpacing: 0.3,
                    }}
                  >
                    🔒 Solicitud de Pagos Bloqueada — Falta Subir Orden de Compra de Perú Compras
                  </div>
                  <div style={{ fontSize: '12.5px', color: '#7f1d1d', marginTop: 4, lineHeight: 1.5 }}>
                    Para habilitar las solicitudes de pago, primero registra la{' '}
                    <strong>Orden de Compra oficial de Perú Compras (OCAM)</strong> con Expediente y Folio.
                  </div>
                </div>
              </div>
            )}

            {/* Ficha Resumen de la OC seleccionada y Control Financiero (OC + Ajustes del Flete) */}
            {oportunidadSeleccionada && (
              <div className="pagos-oc-summary" style={{ borderRadius: 0, marginTop: 14 }}>
                <div className="pagos-oc-summary__header">
                  <div className="pagos-oc-summary__oc-num">
                    <GoogleIcon name="description" size={18} color="#2563eb" />
                    <strong>{oportunidadSeleccionada.ordenCompra?.numeroOC || selectedOCNum}</strong>
                    {oportunidadSeleccionada.ordenCompra?.nroOCAM && (
                      <span
                        style={{
                          fontSize: '11px',
                          background: '#eff6ff',
                          color: '#2563eb',
                          padding: '2px 6px',
                          border: '1px solid #bfdbfe',
                        }}
                      >
                        OCAM: {oportunidadSeleccionada.ordenCompra.nroOCAM}
                      </span>
                    )}
                  </div>
                  <span
                    className="pagos-status-pill pagos-status-pill--active"
                    style={{
                      borderRadius: 0,
                      background: tieneOCAMHabilitada ? '#ecfdf5' : '#fef2f2',
                      color: tieneOCAMHabilitada ? '#059669' : '#dc2626',
                      border: `1px solid ${tieneOCAMHabilitada ? '#a7f3d0' : '#fca5a5'}`,
                    }}
                  >
                    {tieneOCAMHabilitada ? '✓ OC Habilitada para Solicitar Pagos' : '🔒 Requiere OCAM'}
                  </span>
                </div>

                <div className="pagos-oc-summary__grid">
                  <div>
                    <span className="label">Requerimiento:</span>
                    <span className="val">{oportunidadSeleccionada.numeroRequerimiento}</span>
                  </div>
                  <div>
                    <span className="label">Entidad / Cliente:</span>
                    <span className="val">
                      {oportunidadSeleccionada.empresaRazonSocial ||
                        oportunidadSeleccionada.entidadConvocante ||
                        'No especificada'}
                    </span>
                  </div>
                  <div>
                    <span className="label">Monto Base Orden de Compra:</span>
                    <span className="val" style={{ fontWeight: 700, color: '#0f172a' }}>
                      S/ {montoBaseOC.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div>
                    <span className="label">Ajustes del Flete de la OC (S/):</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={montoAjusteFleteInput}
                        onChange={(e) => setMontoAjusteFleteInput(e.target.value)}
                        disabled={!tieneOCAMHabilitada}
                        title="Monto de los ajustes del flete aprobados/registrados para esta OC"
                        style={{
                          width: '125px',
                          padding: '3px 8px',
                          border: '1.5px solid #8b5cf6',
                          background: '#f5f3ff',
                          color: '#5b21b6',
                          fontWeight: 800,
                          fontSize: '12.5px',
                        }}
                      />
                      <span style={{ fontSize: '11px', color: '#6d28d9', fontWeight: 600 }}>
                        (Disp. Flete: S/ {saldoDisponibleFlete.toFixed(2)})
                      </span>
                    </div>
                  </div>
                  <div>
                    <span className="label">Techo Máximo (OC + Ajustes Flete):</span>
                    <span className="val highlight" style={{ color: '#059669', fontWeight: 800 }}>
                      S/ {montoTechoTotalConAjustes.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div>
                    <span className="label">Pagos Acumulados Previos:</span>
                    <span className="val">
                      {pagosPreviosOC.length} pago(s) (Total: S/{' '}
                      {totalAcumuladoPrevio.toLocaleString('es-PE', { minimumFractionDigits: 2 })})
                    </span>
                  </div>
                </div>

                {/* Barra de Consumo del Techo (OC + Ajustes del Flete) */}
                <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid #e2e8f0' }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '11.5px',
                      marginBottom: 4,
                    }}
                  >
                    <span style={{ color: '#475569', fontWeight: 600 }}>
                      Límite Total (Orden de Compra + Ajustes del Flete):
                    </span>
                    <span
                      style={{
                        fontWeight: 700,
                        color: excedeTechoOCConAjustes ? '#dc2626' : '#059669',
                      }}
                    >
                      S/ {totalProyectado.toLocaleString('es-PE', { minimumFractionDigits: 2 })} / S/{' '}
                      {montoTechoTotalConAjustes.toLocaleString('es-PE', { minimumFractionDigits: 2 })} (
                      {montoTechoTotalConAjustes > 0
                        ? Math.min(100, (totalProyectado / montoTechoTotalConAjustes) * 100).toFixed(1)
                        : 0}
                      %)
                    </span>
                  </div>
                  <div style={{ height: 8, background: '#e2e8f0', borderRadius: 0, overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${
                          montoTechoTotalConAjustes > 0
                            ? Math.min(100, (totalProyectado / montoTechoTotalConAjustes) * 100)
                            : 0
                        }%`,
                        background: excedeTechoOCConAjustes
                          ? '#dc2626'
                          : totalProyectado > montoTechoTotalConAjustes * 0.9
                            ? '#ea580c'
                            : '#059669',
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '11px',
                      marginTop: 4,
                    }}
                  >
                    <span style={{ color: '#64748b' }}>
                      Saldo total disponible (OC + Ajustes del Flete):
                    </span>
                    <span
                      style={{
                        fontWeight: 700,
                        color: saldoDisponibleTotal <= 0 ? '#dc2626' : '#15803d',
                      }}
                    >
                      S/ {saldoDisponibleTotal.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* PASO 2: Cuenta Bancaria de la Entidad y Titular */}
        <section
          className="pagos-card"
          style={{ borderRadius: 0, opacity: tieneOCAMHabilitada ? 1 : 0.6 }}
        >
          <div className="pagos-card__header">
            <span
              className="pagos-card__badge"
              style={{ background: `${roleAccent}1a`, color: roleAccent, borderRadius: 0 }}
            >
              Paso 2
            </span>
            <div className="pagos-card__titles">
              <h3>Datos de la Cuenta Bancaria de la Entidad a Depositar</h3>
              <p>
                Indica el Número de Cuenta Bancaria, la Entidad Correspondiente y el Nombre del Titular de la cuenta a la que van a depositar
              </p>
            </div>
          </div>

          <div className="pagos-card__body">
            <div className="pagos-row-2">
              <div className="pagos-form-group">
                <label htmlFor="entidad-correspondiente" className="pagos-label">
                  Entidad Correspondiente (Banco / Financiera) <span className="req">*</span>
                </label>
                <select
                  id="entidad-correspondiente"
                  className="pagos-select"
                  value={entidadCorrespondiente}
                  onChange={(e) => setEntidadCorrespondiente(e.target.value)}
                  disabled={!tieneOCAMHabilitada}
                  style={{ borderRadius: 0 }}
                  required
                >
                  {ENTIDADES_BANCARIAS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pagos-form-group">
                <label htmlFor="numero-cuenta-bancaria" className="pagos-label">
                  Número de Cuenta Bancaria / CCI <span className="req">*</span>
                </label>
                <input
                  id="numero-cuenta-bancaria"
                  type="text"
                  className="pagos-input"
                  placeholder="Ej: 191-9482019-0-32 o CCI 002191009482019032"
                  value={numeroCuentaBancaria}
                  onChange={(e) => setNumeroCuentaBancaria(e.target.value)}
                  disabled={!tieneOCAMHabilitada}
                  style={{ borderRadius: 0, fontFamily: 'monospace', fontWeight: 700 }}
                  required
                />
              </div>
            </div>

            <div className="pagos-row-2">
              <div className="pagos-form-group">
                <label htmlFor="titular-cuenta-input" className="pagos-label">
                  Nombre del Titular de la Cuenta a la que van a depositar <span className="req">*</span>
                </label>
                <input
                  id="titular-cuenta-input"
                  type="text"
                  className="pagos-input"
                  placeholder="Ej: Inversiones Logísticas del Perú S.A.C. / Juan Pérez"
                  value={titularCuenta}
                  onChange={(e) => setTitularCuenta(e.target.value)}
                  disabled={!tieneOCAMHabilitada}
                  style={{ borderRadius: 0 }}
                  required
                />
              </div>

              <div className="pagos-form-group">
                <label htmlFor="metodo-select" className="pagos-label">
                  Modalidad de Depósito / Transferencia
                </label>
                <select
                  id="metodo-select"
                  className="pagos-select"
                  value={metodoPago}
                  onChange={(e) => setMetodoPago(e.target.value as MetodoPago)}
                  disabled={!tieneOCAMHabilitada}
                  style={{ borderRadius: 0 }}
                >
                  {METODOS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </section>

        {/* PASO 3: Concepto y Monto del Pago con Validaciones de OC y Flete */}
        <section
          className="pagos-card"
          style={{ borderRadius: 0, opacity: tieneOCAMHabilitada ? 1 : 0.6 }}
        >
          <div className="pagos-card__header">
            <span
              className="pagos-card__badge"
              style={{ background: `${roleAccent}1a`, color: roleAccent, borderRadius: 0 }}
            >
              Paso 3
            </span>
            <div className="pagos-card__titles">
              <h3>Concepto y Monto Solicitado</h3>
              <p>
                El monto no puede superar la OC incluyendo los ajustes del flete. Si solicitas Flete, no debe superar el monto del ajuste de flete.
              </p>
            </div>
          </div>

          <div className="pagos-card__body">
            {/* SELECTOR DE TIPO DE PAGO COMERCIAL */}
            <div style={{ marginBottom: 16 }}>
              <label className="pagos-label" style={{ marginBottom: 8, display: 'block' }}>
                Tipo de Operación de Pago <span className="req">*</span>
              </label>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: 10,
                }}
              >
                <button
                  type="button"
                  disabled={!tieneOCAMHabilitada}
                  onClick={() => handleCambiarTipoOperacion('proveedor')}
                  style={{
                    padding: '12px',
                    border: tipoOperacion === 'proveedor' ? '2px solid #2563eb' : '1.5px solid #cbd5e1',
                    background: tipoOperacion === 'proveedor' ? '#eff6ff' : '#ffffff',
                    borderRadius: 0,
                    textAlign: 'left',
                    cursor: tieneOCAMHabilitada ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontWeight: 700,
                      fontSize: '13px',
                      color: '#1e3a8a',
                    }}
                  >
                    <GoogleIcon name="inventory_2" size={18} color="#2563eb" />
                    <span>Pago a Proveedor</span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                    Adquisición de mercadería de la OC
                  </div>
                </button>

                <button
                  type="button"
                  disabled={!tieneOCAMHabilitada}
                  onClick={() => handleCambiarTipoOperacion('transporte')}
                  style={{
                    padding: '12px',
                    border: tipoOperacion === 'transporte' ? '2px solid #8b5cf6' : '1.5px solid #cbd5e1',
                    background: tipoOperacion === 'transporte' ? '#f5f3ff' : '#ffffff',
                    borderRadius: 0,
                    textAlign: 'left',
                    cursor: tieneOCAMHabilitada ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontWeight: 700,
                      fontSize: '13px',
                      color: '#5b21b6',
                    }}
                  >
                    <GoogleIcon name="local_shipping" size={18} color="#8b5cf6" />
                    <span>Pago de Flete / Transporte</span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#6d28d9', fontWeight: 600 }}>
                    Tope Ajuste Flete: S/ {montoAjusteFleteOC.toFixed(2)} (Disp: S/ {saldoDisponibleFlete.toFixed(2)})
                  </div>
                </button>

                <button
                  type="button"
                  disabled={!tieneOCAMHabilitada}
                  onClick={() => handleCambiarTipoOperacion('producto_individual')}
                  style={{
                    padding: '12px',
                    border:
                      tipoOperacion === 'producto_individual' ? '2px solid #059669' : '1.5px solid #cbd5e1',
                    background: tipoOperacion === 'producto_individual' ? '#ecfdf5' : '#ffffff',
                    borderRadius: 0,
                    textAlign: 'left',
                    cursor: tieneOCAMHabilitada ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontWeight: 700,
                      fontSize: '13px',
                      color: '#065f46',
                    }}
                  >
                    <GoogleIcon name="widgets" size={18} color="#059669" />
                    <span>Producto Individual</span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                    Precio negociado × unidades
                  </div>
                </button>

                <button
                  type="button"
                  disabled={!tieneOCAMHabilitada}
                  onClick={() => handleCambiarTipoOperacion('otro')}
                  style={{
                    padding: '12px',
                    border: tipoOperacion === 'otro' ? '2px solid #64748b' : '1.5px solid #cbd5e1',
                    background: tipoOperacion === 'otro' ? '#f8fafc' : '#ffffff',
                    borderRadius: 0,
                    textAlign: 'left',
                    cursor: tieneOCAMHabilitada ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontWeight: 700,
                      fontSize: '13px',
                      color: '#334155',
                    }}
                  >
                    <GoogleIcon name="receipt" size={18} color="#64748b" />
                    <span>Otro Concepto</span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                    Comisiones, gastos varios, adelantos
                  </div>
                </button>
              </div>
            </div>

            {/* CASO: PRODUCTO INDIVIDUAL A PROVEEDOR */}
            {tipoOperacion === 'producto_individual' && (
              <div
                style={{
                  background: '#f8fafc',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: 0,
                  padding: 16,
                  marginBottom: 16,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                <div
                  style={{
                    fontSize: '12.5px',
                    fontWeight: 800,
                    color: '#065f46',
                    textTransform: 'uppercase',
                    letterSpacing: 0.4,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <GoogleIcon name="sell" size={16} color="#059669" />
                  <span>Desglose de Producto Individual (Validación de Costo Negociado)</span>
                </div>

                <div className="pagos-form-group">
                  <label htmlFor="select-item" className="pagos-label">
                    Seleccionar Producto del Requerimiento <span className="req">*</span>
                  </label>
                  <select
                    id="select-item"
                    className="pagos-select"
                    value={productoSeleccionadoId}
                    onChange={(e) => {
                      setProductoSeleccionadoId(e.target.value);
                      const targetItem = oportunidadSeleccionada?.items.find(
                        (it) => String(it.id) === e.target.value
                      );
                      if (targetItem) {
                        setCantidadIndividual(String(targetItem.cantidad || 1));
                        const cost =
                          targetItem.proveedores?.[0]?.costoUnitario ??
                          targetItem.precioUnitarioBase ??
                          targetItem.limiteUnitario ??
                          0;
                        setPrecioUnitarioIndividual(cost > 0 ? String(cost) : '');
                      }
                    }}
                    disabled={!tieneOCAMHabilitada}
                    style={{ borderRadius: 0 }}
                  >
                    {(oportunidadSeleccionada?.items || []).map((it) => (
                      <option key={it.id} value={it.id}>
                        {it.numeroParte} · {it.descripcion} (Cantidad: {it.cantidad})
                      </option>
                    ))}
                  </select>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr',
                    gap: 12,
                    alignItems: 'flex-start',
                  }}
                >
                  <div className="pagos-form-group">
                    <label htmlFor="cant-individual" className="pagos-label">
                      Cantidad de Unidades <span className="req">*</span>
                    </label>
                    <input
                      id="cant-individual"
                      type="number"
                      step="1"
                      min="1"
                      className="pagos-input"
                      value={cantidadIndividual}
                      onChange={(e) => setCantidadIndividual(e.target.value)}
                      disabled={!tieneOCAMHabilitada}
                      style={{ borderRadius: 0 }}
                      required
                    />
                  </div>

                  <div className="pagos-form-group">
                    <label htmlFor="precio-unit-individual" className="pagos-label">
                      Precio Unitario (S/) (Máx: S/ {precioNegociadoAnterior.toFixed(2)}) <span className="req">*</span>
                    </label>
                    <input
                      id="precio-unit-individual"
                      type="number"
                      step="0.01"
                      min="0.01"
                      className={`pagos-input ${precioExcedeNegociado ? 'pagos-input--error' : ''}`}
                      value={precioUnitarioIndividual}
                      onChange={(e) => setPrecioUnitarioIndividual(e.target.value)}
                      disabled={!tieneOCAMHabilitada}
                      style={{
                        borderRadius: 0,
                        borderColor: precioExcedeNegociado ? '#dc2626' : undefined,
                        background: precioExcedeNegociado ? '#fef2f2' : undefined,
                      }}
                      required
                    />
                  </div>

                  <div className="pagos-form-group">
                    <label className="pagos-label">Subtotal Calculado (S/)</label>
                    <div
                      style={{
                        padding: '9px 12px',
                        background: '#e2e8f0',
                        fontWeight: 800,
                        fontSize: '14px',
                        color: '#0f172a',
                        border: '1.5px solid #cbd5e1',
                      }}
                    >
                      S/{' '}
                      {(
                        (parseFloat(precioUnitarioIndividual) || 0) *
                        (parseFloat(cantidadIndividual) || 0)
                      ).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Fila: Concepto, Monto y Moneda */}
            <div className="pagos-row-3">
              <div className="pagos-form-group">
                <label htmlFor="select-concepto" className="pagos-label">
                  Concepto del Pago <span className="req">*</span>
                </label>
                <select
                  id="select-concepto"
                  className="pagos-select"
                  value={concepto}
                  onChange={(e) => setConcepto(e.target.value as ConceptoPago)}
                  disabled={!tieneOCAMHabilitada}
                  style={{ borderRadius: 0 }}
                  required
                >
                  {conceptosList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label} {c.desc ? `— ${c.desc}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pagos-form-group">
                <label htmlFor="monto-input" className="pagos-label">
                  Monto a Depositar <span className="req">*</span>
                </label>
                <div className="pagos-input-prefix-wrapper">
                  <span className="pagos-input-prefix">{moneda === 'PEN' ? 'S/' : '$'}</span>
                  <input
                    id="monto-input"
                    type="number"
                    step="0.01"
                    min="0.01"
                    className={`pagos-input pagos-input--prefixed ${
                      excedeTechoOCConAjustes || excedeAjusteFlete ? 'pagos-input--error' : ''
                    }`}
                    placeholder="0.00"
                    value={monto}
                    onChange={(e) => setMonto(e.target.value)}
                    disabled={!tieneOCAMHabilitada || tipoOperacion === 'producto_individual'}
                    style={{
                      borderRadius: 0,
                      borderColor:
                        excedeTechoOCConAjustes || excedeAjusteFlete ? '#dc2626' : undefined,
                      background:
                        excedeTechoOCConAjustes || excedeAjusteFlete ? '#fef2f2' : undefined,
                    }}
                    required
                  />
                </div>
              </div>

              <div className="pagos-form-group">
                <label htmlFor="fecha-input" className="pagos-label">
                  Fecha de Solicitud <span className="req">*</span>
                </label>
                <input
                  id="fecha-input"
                  type="date"
                  className="pagos-input"
                  value={fechaPago}
                  onChange={(e) => setFechaPago(e.target.value)}
                  disabled={!tieneOCAMHabilitada}
                  style={{ borderRadius: 0 }}
                  required
                />
              </div>
            </div>

            {/* ALERTA VALIDACIÓN 2: CUANDO SE PIDE FLETE NO DEBE SER MAYOR A LOS MONTOS DEL AJUSTE */}
            {esSolicitudFlete && (
              <div
                style={{
                  background: excedeAjusteFlete ? '#fef2f2' : '#f5f3ff',
                  border: `1.5px solid ${excedeAjusteFlete ? '#dc2626' : '#8b5cf6'}`,
                  borderRadius: 0,
                  padding: '12px 14px',
                  color: excedeAjusteFlete ? '#991b1b' : '#4c1d95',
                  fontSize: '12.5px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  marginBottom: 12,
                }}
              >
                <GoogleIcon
                  name={excedeAjusteFlete ? 'error' : 'local_shipping'}
                  size={20}
                  color={excedeAjusteFlete ? '#dc2626' : '#7c3aed'}
                />
                <div>
                  <strong>
                    {excedeAjusteFlete
                      ? 'Validación de Flete No Cumplida — Supera el Monto del Ajuste de Flete:'
                      : 'Control de Pago de Flete:'}
                  </strong>{' '}
                  Cuando se solicita Flete, el monto no debe ser mayor a los montos del ajuste de flete de la OC (
                  <strong>S/ {montoAjusteFleteOC.toFixed(2)}</strong>).
                  <div style={{ marginTop: 3, fontSize: '11.5px' }}>
                    Flete acumulado previo: <strong>S/ {fleteAcumuladoPrevio.toFixed(2)}</strong> · Monto flete solicitado:{' '}
                    <strong>S/ {montoActualNum.toFixed(2)}</strong> · Saldo disponible de Ajuste de Flete:{' '}
                    <strong>S/ {saldoDisponibleFlete.toFixed(2)}</strong>.
                  </div>
                </div>
              </div>
            )}

            {/* ALERTA VALIDACIÓN 1: MONTO NO PUEDE SER MAYOR A LA ORDEN DE COMPRA INCLUYENDO LOS AJUSTES DEL FLETE */}
            {excedeTechoOCConAjustes && (
              <div
                style={{
                  background: '#fef2f2',
                  border: '1.5px solid #dc2626',
                  borderRadius: 0,
                  padding: '12px 14px',
                  color: '#991b1b',
                  fontSize: '12.5px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  marginBottom: 12,
                }}
              >
                <GoogleIcon name="block" size={20} color="#dc2626" />
                <div>
                  <strong>Validación Presupuestal No Cumplida:</strong> El monto no puede ser mayor a la Orden de Compra incluyendo los ajustes del flete (OC{' '}
                  <strong>S/ {montoBaseOC.toFixed(2)}</strong> + Ajustes Flete{' '}
                  <strong>S/ {montoAjusteFleteOC.toFixed(2)}</strong> ={' '}
                  <strong>S/ {montoTechoTotalConAjustes.toFixed(2)}</strong>).
                  <div style={{ marginTop: 2, fontSize: '11.5px', color: '#7f1d1d' }}>
                    Total proyectado: S/ {totalProyectado.toFixed(2)} (Exceso: S/{' '}
                    {(totalProyectado - montoTechoTotalConAjustes).toFixed(2)}). El saldo máximo disponible es S/{' '}
                    {saldoDisponibleTotal.toFixed(2)}.
                  </div>
                </div>
              </div>
            )}

            {/* Observaciones */}
            <div className="pagos-form-group">
              <label className="pagos-label">Observaciones / Indicaciones para Administración</label>
              <textarea
                className="pagos-textarea"
                rows={2}
                placeholder="Indica cualquier detalle adicional sobre la cuenta o urgencia del depósito..."
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                disabled={!tieneOCAMHabilitada}
                style={{ borderRadius: 0 }}
              />
            </div>
          </div>
        </section>

        {/* Barra de Acciones */}
        <div className="pagos-form-actions">
          {onCancelar && (
            <button
              type="button"
              className="pagos-btn pagos-btn--secondary"
              onClick={onCancelar}
              style={{ borderRadius: 0 }}
            >
              Cancelar
            </button>
          )}
          <button
            type="submit"
            className="pagos-btn pagos-btn--primary"
            disabled={formularioBloqueado}
            style={{
              background: formularioBloqueado ? '#94a3b8' : roleAccent,
              borderRadius: 0,
              cursor: formularioBloqueado ? 'not-allowed' : 'pointer',
            }}
          >
            {isSubmitting ? (
              <>
                <span className="pagos-spinner" />
                <span>Procesando solicitud...</span>
              </>
            ) : (
              <>
                <GoogleIcon
                  name={formularioBloqueado ? 'lock' : 'send'}
                  size={19}
                  color="#fff"
                />
                <span>
                  {!tieneOCAMHabilitada
                    ? 'Bloqueado (Falta OCAM de Perú Compras)'
                    : excedeAjusteFlete
                      ? 'Bloqueado (Flete Supera el Ajuste de Flete)'
                      : excedeTechoOCConAjustes
                        ? 'Bloqueado (Supera OC + Ajustes del Flete)'
                        : precioExcedeNegociado
                          ? 'Bloqueado (Precio Excede Negociado)'
                          : esModoCorreccion
                            ? 'Guardar Corrección y Reenviar a Revisión'
                            : 'Solicitar Pago a Administración'}
                </span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
