
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import Swal from 'sweetalert2';
import { GoogleIcon } from '../../../components/GoogleIcon';
import { useAuth } from '../../../context/AuthContext';
import type { Oportunidad, ProductoItem } from '../../../types/oportunidades';
import type { ConceptoPago, MetodoPago, PagoOC } from '../../../types/pagos';
import { registrarPago, obtenerPagos } from '../../../api/services/pagos.service';
import { getConceptosPago } from '../../../api/services/conceptosPago.service';
import './Pagos.css';

interface RegistrarPagoViewProps {
  oportunidades: Oportunidad[];
  roleAccent?: string;
  preselectedOC?: string;
  onPagoRegistrado?: (nuevoPago: PagoOC) => void;
  onCancelar?: () => void;
}

type TipoOperacionPago = 'proveedor' | 'transporte' | 'producto_individual' | 'otro';

const CONCEPTOS_BASE: { id: ConceptoPago; label: string; icon: string; desc: string; color: string }[] = [
  { id: 'Mercadería / Proveedor', label: 'Pago a Proveedor', icon: 'inventory_2', desc: 'Pago directo o abono a proveedor', color: '#2563eb' },
  { id: 'Flete', label: 'Pago a Transporte', icon: 'local_shipping', desc: 'Transporte, flete terrestre o aéreo', color: '#8b5cf6' },
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

const BANCOS = [
  'BCP (Banco de Crédito)',
  'BBVA',
  'Interbank',
  'Scotiabank',
  'Banco de la Nación',
  'BanBif',
  'Caja Municipal / Otro',
];

export const RegistrarPagoView: React.FC<RegistrarPagoViewProps> = ({
  oportunidades,
  roleAccent = '#2563eb',
  preselectedOC,
  onPagoRegistrado,
  onCancelar,
}) => {
  const { empleado } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    if (preselectedOC) return resolverClaveOC(preselectedOC);
    // Priorizar una que ya tenga OCAM registrada
    const conOC = oportunidadesDisponibles.find((o) => o.ordenCompra?.numeroOC || o.ordenCompra?.nroOCAM);
    if (conOC?.ordenCompra?.numeroOC) return conOC.ordenCompra.numeroOC;
    return oportunidadesDisponibles[0]?.ordenCompra?.numeroOC || (oportunidadesDisponibles[0] ? `OC-REQ-${oportunidadesDisponibles[0].numeroRequerimiento}` : '');
  });

  // Sincronizar automáticamente cuando cambie la OC preseleccionada (navegación desde Seguimiento OC)
  useEffect(() => {
    if (preselectedOC) {
      const resolved = resolverClaveOC(preselectedOC);
      setSelectedOCNum(resolved);
    }
  }, [preselectedOC, resolverClaveOC]);

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

  // ── REGLA COMERCIAL: VERIFICAR SI TIENE LA OCAM OFICIAL DE PERÚ COMPRAS SUBIDA ──
  // Se requiere: nroOCAM, nroExpediente, y haber registrado folio / documento o estar en Cotización
  const tieneOCAMHabilitada = useMemo(() => {
    if (!oportunidadSeleccionada) return false;
    const oc = oportunidadSeleccionada.ordenCompra;
    if (!oc) return false;

    const tieneDatosObligatorios = Boolean(
      (oc.nroOCAM && oc.nroOCAM.trim()) &&
      (oc.nroExpediente && oc.nroExpediente.trim())
    );

    const tieneOCValidaRegistrada = Boolean(
      (oc.numeroOC && oc.numeroOC.trim()) &&
      (oc.montoOCAM && oc.montoOCAM > 0)
    );

    const estadoAvanzado =
      oportunidadSeleccionada.estado === 'Cotización' ||
      oportunidadSeleccionada.estado === 'Adjudicada' ||
      ['OC_RECIBIDA', 'OC_ACEPTADA', 'ENTREGADA'].includes(oportunidadSeleccionada.estado);

    const tieneDocumentoOFolio = Boolean(
      (oc.nroFolio && oc.nroFolio.trim()) ||
      (oc.archivoOCUrl && oc.archivoOCUrl.trim())
    );

    return (tieneDatosObligatorios && (estadoAvanzado || tieneDocumentoOFolio)) ||
      (tieneOCValidaRegistrada && (estadoAvanzado || tieneDocumentoOFolio));
  }, [oportunidadSeleccionada]);

  // Historial de pagos previos de la OC para control del Techo Financiero
  const pagosPreviosOC = useMemo(() => {
    if (!oportunidadSeleccionada && !selectedOCNum) return [];
    const todos = obtenerPagos();
    const opId = oportunidadSeleccionada?.id;
    const opReq = oportunidadSeleccionada?.numeroRequerimiento?.trim().toLowerCase();
    const opOC = oportunidadSeleccionada?.ordenCompra?.numeroOC?.trim().toLowerCase();
    const opOCAM = oportunidadSeleccionada?.ordenCompra?.nroOCAM?.trim().toLowerCase();
    const target = selectedOCNum.trim().toLowerCase();

    return todos.filter((p) => {
      if (opId && p.oportunidadId && Number(p.oportunidadId) === Number(opId)) return true;
      const pOC = p.numeroOC?.trim().toLowerCase();
      const pReq = p.numeroRequerimiento?.trim().toLowerCase();
      return (
        (pOC && (pOC === target || pOC === opOC || pOC === opOCAM)) ||
        (opReq && pReq && pReq === opReq)
      );
    });
  }, [oportunidadSeleccionada, selectedOCNum]);

  const totalAcumuladoPrevio = useMemo(() => {
    return pagosPreviosOC.reduce((sum, p) => sum + (p.moneda === 'PEN' ? p.monto : 0), 0);
  }, [pagosPreviosOC]);

  // Techo financiero de la OCAM de Perú Compras
  const montoTechoOCAM = useMemo(() => {
    if (!oportunidadSeleccionada) return 0;
    if (oportunidadSeleccionada.ordenCompra?.montoOCAM != null && oportunidadSeleccionada.ordenCompra.montoOCAM > 0) {
      return Number(oportunidadSeleccionada.ordenCompra.montoOCAM);
    }
    return Number(oportunidadSeleccionada.limiteTotal) || 0;
  }, [oportunidadSeleccionada]);

  // Conceptos dinámicos cargados desde el backend
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
      .catch((err) => {
        console.warn('Usando conceptos base locales:', err);
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

  // Producto seleccionado actual
  const productoSeleccionado: ProductoItem | undefined = useMemo(() => {
    if (!oportunidadSeleccionada?.items) return undefined;
    if (productoSeleccionadoId) {
      return oportunidadSeleccionada.items.find((it) => String(it.id) === String(productoSeleccionadoId));
    }
    return oportunidadSeleccionada.items[0];
  }, [oportunidadSeleccionada, productoSeleccionadoId]);

  // Sincronizar producto seleccionado por defecto al cambiar oportunidad
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

  // Precio Negociado Anteriormente para el producto seleccionado
  const precioNegociadoAnterior = useMemo(() => {
    if (!productoSeleccionado) return 0;
    return (
      productoSeleccionado.proveedores?.[0]?.costoUnitario ??
      productoSeleccionado.precioUnitarioBase ??
      productoSeleccionado.limiteUnitario ??
      0
    );
  }, [productoSeleccionado]);

  // Manejo del cambio de Tipo de Operación
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

  // Monto numérico general
  const [monto, setMonto] = useState<string>('');
  const [moneda, setMoneda] = useState<'PEN' | 'USD'>('PEN');
  const [fechaPago, setFechaPago] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('Transferencia Bancaria');
  const [banco, setBanco] = useState<string>('BCP (Banco de Crédito)');
  const [numeroOperacion, setNumeroOperacion] = useState<string>('');
  const [beneficiario, setBeneficiario] = useState<string>('');
  const [notas, setNotas] = useState<string>('');

  // Sincronización automática de monto cuando es producto individual
  useEffect(() => {
    if (tipoOperacion === 'producto_individual') {
      const pUnit = parseFloat(precioUnitarioIndividual) || 0;
      const cant = parseFloat(cantidadIndividual) || 0;
      const subtotal = pUnit * cant;
      setMonto(subtotal > 0 ? subtotal.toFixed(2) : '');
    }
  }, [tipoOperacion, precioUnitarioIndividual, cantidadIndividual]);

  // ── VALIDACIÓN 1: PRECIO UNITARIO INDIVIDUAL <= PRECIO NEGOCIADO ANTERIOR ──
  const precioExcedeNegociado = useMemo(() => {
    if (tipoOperacion !== 'producto_individual') return false;
    const pUnit = parseFloat(precioUnitarioIndividual) || 0;
    if (precioNegociadoAnterior <= 0) return false;
    return pUnit > precioNegociadoAnterior + 0.001; // tolerancia centavos
  }, [tipoOperacion, precioUnitarioIndividual, precioNegociadoAnterior]);

  // ── VALIDACIÓN 2: SUMA DE PAGOS ACUMULADOS <= MONTO OCAM (PERÚ COMPRAS) ──
  const montoActualNum = parseFloat(monto) || 0;
  const totalProyectado = totalAcumuladoPrevio + montoActualNum;
  const saldoDisponible = Math.max(0, montoTechoOCAM - totalAcumuladoPrevio);
  const excedeTechoOCAM = montoTechoOCAM > 0 && totalProyectado > montoTechoOCAM + 0.01;

  // Archivo y preview de comprobante
  const [archivo, setArchivo] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSetFile = useCallback((file: File) => {
    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isImage && !isPdf) {
      Swal.fire({
        icon: 'warning',
        title: 'Formato no soportado',
        text: 'Por favor adjunta una imagen (PNG, JPG, WEBP) o un documento PDF del comprobante de pago.',
        confirmButtonColor: roleAccent,
      });
      return;
    }
    setArchivo(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  }, [roleAccent]);

  // Escuchar pegado desde portapapeles (Ctrl+V)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (!e.clipboardData) return;
      const items = e.clipboardData.items;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            handleSetFile(file);
            break;
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [handleSetFile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleSetFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleClearFile = () => {
    setArchivo(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Validar que la OCAM esté habilitada
    if (!tieneOCAMHabilitada) {
      Swal.fire({
        icon: 'error',
        title: 'Solicitud Bloqueada',
        html: `Esta oportunidad aún no tiene la <strong>Orden de Compra oficial de Perú Compras (OCAM)</strong> registrada con Expediente, Folio y Documento.<br/><br/>Primero sube la OCAM para pasar a estado <strong>Cotización</strong> y habilitar los pagos.`,
        confirmButtonColor: '#dc2626',
      });
      return;
    }

    if (!selectedOCNum) {
      Swal.fire({
        icon: 'warning',
        title: 'Orden de Compra requerida',
        text: 'Debes seleccionar una Orden de Compra para vincular el pago.',
        confirmButtonColor: roleAccent,
      });
      return;
    }

    // 2. Validar regla de Precio Negociado si es producto individual
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
          html: `El precio unitario ingresado (<strong>S/ ${pUnit.toFixed(2)}</strong>) <strong>NO DEBE SER MAYOR</strong> al precio negociado anteriormente (<strong>S/ ${precioNegociadoAnterior.toFixed(2)}</strong>).<br/><br/>Ajusta el precio o renegocia con el proveedor.`,
          confirmButtonColor: '#dc2626',
        });
        return;
      }
    }

    // 3. Validar Monto
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

    // 4. Validar Techo Financiero de la OCAM de Perú Compras
    if (excedeTechoOCAM) {
      const exceso = totalProyectado - montoTechoOCAM;
      Swal.fire({
        icon: 'error',
        title: 'Techo Financiero de OCAM Superado',
        html: `
          <div style="text-align: left; font-size: 13px; line-height: 1.5;">
            <p>La suma acumulada de pagos no puede exceder el monto de la Orden de Compra / Proforma de Perú Compras:</p>
            <ul style="margin: 8px 0; padding-left: 20px;">
              <li>Monto OCAM (Techo): <strong>S/ ${montoTechoOCAM.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</strong></li>
              <li>Pagos acumulados previos: <strong>S/ ${totalAcumuladoPrevio.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</strong></li>
              <li>Nuevo pago solicitado: <strong>S/ ${valorMonto.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</strong></li>
              <li>Total Proyectado: <strong>S/ ${totalProyectado.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</strong></li>
              <li style="color: #dc2626;">Exceso no permitido: <strong>S/ ${exceso.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</strong></li>
            </ul>
            <p>El saldo máximo disponible para este pago es de <strong>S/ ${saldoDisponible.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</strong>.</p>
          </div>
        `,
        confirmButtonColor: '#dc2626',
      });
      return;
    }

    // 5. Validar captura
    if (!archivo) {
      Swal.fire({
        icon: 'warning',
        title: 'Captura requerida',
        text: 'Es obligatorio adjuntar la captura o voucher del pago.',
        confirmButtonColor: roleAccent,
      });
      return;
    }

    // Construir concepto y notas descriptivas
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
      const nuevo = await registrarPago(
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
          moneda,
          fechaPago,
          metodoPago,
          banco: metodoPago === 'Efectivo' ? undefined : banco,
          numeroOperacion,
          beneficiario,
          notas: [
            tipoOperacion === 'producto_individual'
              ? `[Producto: ${productoSeleccionado?.numeroParte || ''} | Cant: ${cantidadIndividual} | P.Unit: S/ ${precioUnitarioIndividual} | P.Negociado: S/ ${precioNegociadoAnterior.toFixed(2)}]`
              : '',
            notas,
          ].filter(Boolean).join(' - '),
          archivoComprobante: archivo,
        },
        {
          nombreCompleto: empleado?.nombreCompleto || `${empleado?.nombres ?? ''} ${empleado?.apellidos ?? ''}`.trim() || 'Ejecutiva de Ventas',
          email: empleado?.email || 'ventas@rebelqueen.com',
        }
      );

      await Swal.fire({
        icon: 'success',
        title: '¡Pago Solicitado con Éxito!',
        html: `
          <div style="text-align: left; font-size: 13px;">
            <p>Se registró correctamente el pago <strong>${nuevo.codigoPago}</strong> vinculado a la OC <strong>${nuevo.numeroOC}</strong>.</p>
            <p>Concepto: <strong>${detalleConceptoFinal}</strong></p>
            <p>Monto: <strong>${moneda === 'PEN' ? 'S/' : '$'} ${valorMonto.toFixed(2)}</strong></p>
            <p style="color: #059669; font-weight: 600;">Saldo disponible restante de la OCAM: S/ ${Math.max(0, montoTechoOCAM - (totalAcumuladoPrevio + valorMonto)).toFixed(2)}</p>
          </div>
        `,
        confirmButtonColor: '#059669',
      });

      // Limpiar formulario
      setMonto('');
      setNumeroOperacion('');
      setBeneficiario('');
      setNotas('');
      handleClearFile();

      if (onPagoRegistrado) {
        onPagoRegistrado(nuevo);
      }
    } catch (err: any) {
      console.error(err);
      Swal.fire({
        icon: 'error',
        title: 'Error al registrar',
        text: err?.message || 'No se pudo guardar el pago. Intenta nuevamente.',
        confirmButtonColor: roleAccent,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="pagos-form-container" style={{ borderRadius: 0 }}>
      {/* Header del formulario */}
      <div className="pagos-form-header" style={{ borderRadius: 0 }}>
        <div className="pagos-form-header__title">
          <div className="pagos-form-header__icon" style={{ background: `${roleAccent}15`, color: roleAccent, borderRadius: 0 }}>
            <GoogleIcon name="add_card" size={24} color={roleAccent} />
          </div>
          <div>
            <h2>Solicitud de Pagos de OC (Perú Compras)</h2>
            <p>
              Módulo para <strong>Ejecutiva de Ventas / Master en Ventas</strong>: Solicita pagos a proveedor, transporte o por producto individual con validación de precios negociados y techo OCAM.
            </p>
          </div>
        </div>
        {onCancelar && (
          <button type="button" className="pagos-btn pagos-btn--outline" onClick={onCancelar} style={{ borderRadius: 0 }}>
            <GoogleIcon name="arrow_back" size={18} />
            <span>Volver al Historial</span>
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="pagos-form">
        {/* BLOQUE 1: Selección de Orden de Compra y Estado OCAM */}
        <section className="pagos-card" style={{ borderRadius: 0 }}>
          <div className="pagos-card__header">
            <span className="pagos-card__badge" style={{ background: `${roleAccent}1a`, color: roleAccent, borderRadius: 0 }}>
              Paso 1
            </span>
            <div className="pagos-card__titles">
              <h3>Selección de Orden de Compra / Requerimiento</h3>
              <p>Elige el requerimiento para verificar la OCAM oficial y el saldo presupuestal</p>
            </div>
          </div>

          <div className="pagos-card__body">
            <div className="pagos-form-group">
              <label htmlFor="select-oc" className="pagos-label">
                Orden de Compra / Requerimiento <span className="req">*</span>
              </label>
              <select
                id="select-oc"
                className="pagos-select"
                value={selectedOCNum}
                onChange={(e) => setSelectedOCNum(e.target.value)}
                style={{ borderRadius: 0 }}
                required
              >
                <option value="">-- Selecciona una Orden de Compra / Requerimiento --</option>
                {oportunidadesDisponibles.map((op) => {
                  const ocNum = op.ordenCompra?.numeroOC || `OC-REQ-${op.numeroRequerimiento}`;
                  const tieneOCAM = op.ordenCompra?.nroOCAM && op.ordenCompra?.nroExpediente;
                  return (
                    <option key={op.id} value={ocNum}>
                      {tieneOCAM ? '✓ [OCAM OK]' : '🔒 [Falta OCAM]'} {op.ordenCompra?.nroOCAM || ocNum} · RQ: {op.numeroRequerimiento} · {op.empresaRazonSocial || op.entidadConvocante || 'Entidad'} ({op.estado})
                    </option>
                  );
                })}
              </select>
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
                <div style={{ background: '#fee2e2', padding: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <GoogleIcon name="lock" size={26} color="#dc2626" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#991b1b', textTransform: 'uppercase', letterSpacing: 0.3 }}>
                    🔒 Solicitud de Pagos Bloqueada — Falta Subir Orden de Compra de Perú Compras
                  </div>
                  <div style={{ fontSize: '12.5px', color: '#7f1d1d', marginTop: 4, lineHeight: 1.5 }}>
                    Para poder habilitar los campos y solicitar pagos a proveedor o flete, se debe subir el documento de la <strong>Orden de Compra oficial de Perú Compras (OCAM)</strong> y registrar el <strong>Número de Expediente</strong>, <strong>Número de OCAM</strong> y <strong>Número de Folio</strong>.
                  </div>
                  <div style={{ fontSize: '12px', color: '#991b1b', marginTop: 6, fontWeight: 600 }}>
                    Estado actual del requerimiento: <span style={{ padding: '2px 6px', background: '#ffffff', border: '1px solid #fca5a5' }}>{oportunidadSeleccionada.estado}</span>
                  </div>
                  <div style={{ marginTop: 10 }}>
                    <a
                      href={
                        empleado?.rolNombre === 'Administrador' || empleado?.rolNombre === 'SysAdmin'
                          ? `/admin/resolver-oportunidades?tab=resolver&rq=${encodeURIComponent(oportunidadSeleccionada.numeroRequerimiento)}`
                          : `/${empleado?.rolNombre === 'Ejecutivo(a) Master Ventas' ? 'master' : 'ejecutiva'}/seguimiento-oc`
                      }
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        background: '#dc2626',
                        color: '#ffffff',
                        padding: '7px 12px',
                        borderRadius: 0,
                        fontSize: '11.5px',
                        fontWeight: 700,
                        textDecoration: 'none',
                      }}
                    >
                      <GoogleIcon name="upload_file" size={14} color="#ffffff" />
                      <span>Ir a Registrar / Subir OCAM (Perú Compras)</span>
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* Ficha Resumen de la OC seleccionada y Control Financiero del Techo */}
            {oportunidadSeleccionada && (
              <div className="pagos-oc-summary" style={{ borderRadius: 0, marginTop: 14 }}>
                <div className="pagos-oc-summary__header">
                  <div className="pagos-oc-summary__oc-num">
                    <GoogleIcon name="description" size={18} color="#2563eb" />
                    <strong>{oportunidadSeleccionada.ordenCompra?.numeroOC || selectedOCNum}</strong>
                    {oportunidadSeleccionada.ordenCompra?.nroOCAM && (
                      <span style={{ fontSize: '11px', background: '#eff6ff', color: '#2563eb', padding: '2px 6px', border: '1px solid #bfdbfe' }}>
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
                    {tieneOCAMHabilitada ? '✓ OCAM Habilitada para Pagos' : '🔒 Requiere OCAM'}
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
                      {oportunidadSeleccionada.empresaRazonSocial || oportunidadSeleccionada.entidadConvocante || 'No especificada'}
                    </span>
                  </div>
                  <div>
                    <span className="label">N° Expediente:</span>
                    <span className="val">{oportunidadSeleccionada.ordenCompra?.nroExpediente || 'No registrado'}</span>
                  </div>
                  <div>
                    <span className="label">N° Folio:</span>
                    <span className="val">{oportunidadSeleccionada.ordenCompra?.nroFolio || 'No registrado'}</span>
                  </div>
                  <div>
                    <span className="label">Monto OCAM (Techo Perú Compras):</span>
                    <span className="val highlight" style={{ color: '#059669', fontWeight: 800 }}>
                      S/ {montoTechoOCAM.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div>
                    <span className="label">Pagos Acumulados Previos:</span>
                    <span className="val">
                      {pagosPreviosOC.length} pago(s) (Total: S/ {totalAcumuladoPrevio.toLocaleString('es-PE', { minimumFractionDigits: 2 })})
                    </span>
                  </div>
                </div>

                {/* Barra de Consumo del Techo OCAM */}
                <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', marginBottom: 4 }}>
                    <span style={{ color: '#475569', fontWeight: 600 }}>Presupuesto OCAM Consumido:</span>
                    <span style={{ fontWeight: 700, color: excedeTechoOCAM ? '#dc2626' : '#059669' }}>
                      S/ {totalProyectado.toLocaleString('es-PE', { minimumFractionDigits: 2 })} / S/ {montoTechoOCAM.toLocaleString('es-PE', { minimumFractionDigits: 2 })} ({montoTechoOCAM > 0 ? Math.min(100, (totalProyectado / montoTechoOCAM) * 100).toFixed(1) : 0}%)
                    </span>
                  </div>
                  <div style={{ height: 8, background: '#e2e8f0', borderRadius: 0, overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${montoTechoOCAM > 0 ? Math.min(100, (totalProyectado / montoTechoOCAM) * 100) : 0}%`,
                        background: excedeTechoOCAM ? '#dc2626' : totalProyectado > montoTechoOCAM * 0.9 ? '#ea580c' : '#059669',
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginTop: 4 }}>
                    <span style={{ color: '#64748b' }}>Saldo disponible para este pago:</span>
                    <span style={{ fontWeight: 700, color: saldoDisponible <= 0 ? '#dc2626' : '#15803d' }}>
                      S/ {saldoDisponible.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* BLOQUE 2: Tipo de Operación y Datos Financieros */}
        <section className="pagos-card" style={{ borderRadius: 0, opacity: tieneOCAMHabilitada ? 1 : 0.6 }}>
          <div className="pagos-card__header">
            <span className="pagos-card__badge" style={{ background: `${roleAccent}1a`, color: roleAccent, borderRadius: 0 }}>
              Paso 2
            </span>
            <div className="pagos-card__titles">
              <h3>Concepto de Pago y Desglose Financiero</h3>
              <p>Selecciona el tipo de pago: Proveedor (1000 soles), Transporte (400 soles) o Producto Individual (precio negociado × unidades)</p>
            </div>
          </div>

          <div className="pagos-card__body">
            {/* SELECTOR DE TIPO DE PAGO COMERCIAL */}
            <div style={{ marginBottom: 16 }}>
              <label className="pagos-label" style={{ marginBottom: 8, display: 'block' }}>
                Tipo de Operación de Pago <span className="req">*</span>
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
                {/* Opción 1: Pago a Proveedor */}
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: '13px', color: '#1e3a8a' }}>
                    <GoogleIcon name="inventory_2" size={18} color="#2563eb" />
                    <span>Pago a Proveedor</span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                    Monto global para adquisición (ej. S/ 1,000.00)
                  </div>
                </button>

                {/* Opción 2: Pago a Transporte */}
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: '13px', color: '#5b21b6' }}>
                    <GoogleIcon name="local_shipping" size={18} color="#8b5cf6" />
                    <span>Pago a Transporte</span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                    Flete y despacho de carga (ej. S/ 400.00)
                  </div>
                </button>

                {/* Opción 3: Pago de Producto Individual a Proveedor */}
                <button
                  type="button"
                  disabled={!tieneOCAMHabilitada}
                  onClick={() => handleCambiarTipoOperacion('producto_individual')}
                  style={{
                    padding: '12px',
                    border: tipoOperacion === 'producto_individual' ? '2px solid #059669' : '1.5px solid #cbd5e1',
                    background: tipoOperacion === 'producto_individual' ? '#ecfdf5' : '#ffffff',
                    borderRadius: 0,
                    textAlign: 'left',
                    cursor: tieneOCAMHabilitada ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: '13px', color: '#065f46' }}>
                    <GoogleIcon name="widgets" size={18} color="#059669" />
                    <span>Producto Individual a Proveedor</span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                    Precio negociado × unidades (ej. S/ 100 × 10 unids)
                  </div>
                </button>

                {/* Opción 4: Otro Concepto */}
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: '13px', color: '#334155' }}>
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
                <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#065f46', textTransform: 'uppercase', letterSpacing: 0.4, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <GoogleIcon name="sell" size={16} color="#059669" />
                  <span>Desglose de Producto Individual (Validación de Costo Negociado)</span>
                </div>

                {/* Selector de Producto */}
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
                      const targetItem = oportunidadSeleccionada?.items.find((it) => String(it.id) === e.target.value);
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

                {/* Ficha del Precio Negociado Anteriormente */}
                {productoSeleccionado && (
                  <div
                    style={{
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: 0,
                      padding: 12,
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                      gap: 10,
                    }}
                  >
                    <div>
                      <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, display: 'block' }}>N° de Parte:</span>
                      <strong style={{ fontSize: '13px', color: '#0f172a' }}>{productoSeleccionado.numeroParte}</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, display: 'block' }}>Cantidad en Requerimiento:</span>
                      <strong style={{ fontSize: '13px', color: '#0f172a' }}>{productoSeleccionado.cantidad} unidades</strong>
                    </div>
                    <div style={{ background: '#f0fdf4', padding: '6px 10px', border: '1px solid #86efac' }}>
                      <span style={{ fontSize: '11px', color: '#166534', fontWeight: 700, display: 'block' }}>
                        PRECIO NEGOCIADO ANTERIORMENTE:
                      </span>
                      <strong style={{ fontSize: '15px', color: '#15803d' }}>
                        S/ {precioNegociadoAnterior.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                      </strong>
                    </div>
                  </div>
                )}

                {/* Inputs de Cantidad y Precio Unitario */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, alignItems: 'flex-start' }}>
                  <div className="pagos-form-group">
                    <label htmlFor="cant-individual" className="pagos-label">
                      Cantidad de Unidades a Pagar <span className="req">*</span>
                    </label>
                    <input
                      id="cant-individual"
                      type="number"
                      step="1"
                      min="1"
                      className="pagos-input"
                      placeholder="10"
                      value={cantidadIndividual}
                      onChange={(e) => setCantidadIndividual(e.target.value)}
                      disabled={!tieneOCAMHabilitada}
                      style={{ borderRadius: 0 }}
                      required
                    />
                  </div>

                  <div className="pagos-form-group">
                    <label htmlFor="precio-unit-individual" className="pagos-label">
                      Precio Unitario a Pagar (S/) <span className="req">*</span>
                    </label>
                    <input
                      id="precio-unit-individual"
                      type="number"
                      step="0.01"
                      min="0.01"
                      className={`pagos-input ${precioExcedeNegociado ? 'pagos-input--error' : ''}`}
                      placeholder="100.00"
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
                      S/ {(
                        (parseFloat(precioUnitarioIndividual) || 0) * (parseFloat(cantidadIndividual) || 0)
                      ).toFixed(2)}
                    </div>
                  </div>
                </div>

                {/* ALERTA DE PRECIO NEGOCIADO EXCEDIDO */}
                {precioExcedeNegociado && (
                  <div
                    style={{
                      background: '#fef2f2',
                      border: '1.5px solid #f87171',
                      borderRadius: 0,
                      padding: '10px 14px',
                      color: '#991b1b',
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <GoogleIcon name="error" size={18} color="#dc2626" />
                    <span>
                      <strong>Error Financiero:</strong> El precio unitario ingresado (S/ {parseFloat(precioUnitarioIndividual || '0').toFixed(2)}) <strong>NO DEBE SER MAYOR</strong> al precio negociado anteriormente (S/ {precioNegociadoAnterior.toFixed(2)}).
                    </span>
                  </div>
                )}
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
                  Monto Total a Pagar <span className="req">*</span>
                </label>
                <div className="pagos-input-prefix-wrapper">
                  <span className="pagos-input-prefix">{moneda === 'PEN' ? 'S/' : '$'}</span>
                  <input
                    id="monto-input"
                    type="number"
                    step="0.01"
                    min="0.01"
                    className={`pagos-input pagos-input--prefixed ${excedeTechoOCAM ? 'pagos-input--error' : ''}`}
                    placeholder="0.00"
                    value={monto}
                    onChange={(e) => setMonto(e.target.value)}
                    disabled={!tieneOCAMHabilitada || tipoOperacion === 'producto_individual'}
                    style={{
                      borderRadius: 0,
                      borderColor: excedeTechoOCAM ? '#dc2626' : undefined,
                      background: excedeTechoOCAM ? '#fef2f2' : undefined,
                    }}
                    required
                  />
                </div>
              </div>

              <div className="pagos-form-group">
                <label className="pagos-label">Moneda</label>
                <div className="pagos-radio-group">
                  <label className="pagos-radio-label">
                    <input
                      type="radio"
                      name="moneda"
                      value="PEN"
                      checked={moneda === 'PEN'}
                      onChange={() => setMoneda('PEN')}
                      disabled={!tieneOCAMHabilitada}
                    />
                    <span>Soles (PEN)</span>
                  </label>
                  <label className="pagos-radio-label">
                    <input
                      type="radio"
                      name="moneda"
                      value="USD"
                      checked={moneda === 'USD'}
                      onChange={() => setMoneda('USD')}
                      disabled={!tieneOCAMHabilitada}
                    />
                    <span>Dólares (USD)</span>
                  </label>
                </div>
              </div>
            </div>

            {/* ALERTA DE EXCESO DE TECHO OCAM */}
            {excedeTechoOCAM && (
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
                  marginTop: -6,
                  marginBottom: 12,
                }}
              >
                <GoogleIcon name="block" size={20} color="#dc2626" />
                <div>
                  <strong>Tope Presupuestal Excedido:</strong> La suma de pagos acumulados (S/ {totalProyectado.toFixed(2)}) <strong>NO DEBE SER MAYOR</strong> que la Orden de Compra / Proforma emitida por Perú Compras (S/ {montoTechoOCAM.toFixed(2)}).
                  <div style={{ marginTop: 2, fontSize: '11.5px', color: '#7f1d1d' }}>
                    Exceso: S/ {(totalProyectado - montoTechoOCAM).toFixed(2)}. Ajusta el importe para no superar el saldo disponible de S/ {saldoDisponible.toFixed(2)}.
                  </div>
                </div>
              </div>
            )}

            {/* Especificar concepto personalizado si es "Otro" o no es estándar */}
            {(concepto === 'Otro' || tipoOperacion === 'otro') && (
              <div className="pagos-form-group" style={{ marginTop: -4 }}>
                <label htmlFor="concepto-personalizado" className="pagos-label">
                  Especificar concepto personalizado <span className="req">*</span>
                </label>
                <input
                  id="concepto-personalizado"
                  type="text"
                  className="pagos-input"
                  placeholder="Ej: Embalaje especial en madera, Seguro de tránsito, etc."
                  value={conceptoPersonalizado}
                  onChange={(e) => setConceptoPersonalizado(e.target.value)}
                  disabled={!tieneOCAMHabilitada}
                  style={{ borderRadius: 0 }}
                  required
                />
              </div>
            )}

            {/* Fila: Fecha, Método y Banco */}
            <div className="pagos-row-3">
              <div className="pagos-form-group">
                <label htmlFor="fecha-input" className="pagos-label">
                  Fecha del Pago <span className="req">*</span>
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

              <div className="pagos-form-group">
                <label htmlFor="metodo-select" className="pagos-label">Método de Pago</label>
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

              <div className="pagos-form-group">
                <label htmlFor="banco-select" className="pagos-label">Banco / Entidad</label>
                <select
                  id="banco-select"
                  className="pagos-select"
                  value={metodoPago === 'Efectivo' ? '' : banco}
                  onChange={(e) => setBanco(e.target.value)}
                  disabled={!tieneOCAMHabilitada || metodoPago === 'Efectivo'}
                  style={{ borderRadius: 0 }}
                >
                  {metodoPago === 'Efectivo' ? (
                    <option value="">No aplica (Efectivo)</option>
                  ) : (
                    BANCOS.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            {/* Fila: N° Operación y Beneficiario */}
            <div className="pagos-row-2">
              <div className="pagos-form-group">
                <label htmlFor="op-input" className="pagos-label">N° de Operación / Referencia Bancaria</label>
                <input
                  id="op-input"
                  type="text"
                  className="pagos-input"
                  placeholder="Ej: 08472910 o Ref. Interbancaria"
                  value={numeroOperacion}
                  onChange={(e) => setNumeroOperacion(e.target.value)}
                  disabled={!tieneOCAMHabilitada}
                  style={{ borderRadius: 0 }}
                />
              </div>

              <div className="pagos-form-group">
                <label htmlFor="beneficiario-input" className="pagos-label">Beneficiario / Destinatario del Pago</label>
                <input
                  id="beneficiario-input"
                  type="text"
                  className="pagos-input"
                  placeholder="Ej: Transportes Marvisur, Proveedor Tech S.A.C."
                  value={beneficiario}
                  onChange={(e) => setBeneficiario(e.target.value)}
                  disabled={!tieneOCAMHabilitada}
                  style={{ borderRadius: 0 }}
                />
              </div>
            </div>

            {/* Observaciones */}
            <div className="pagos-form-group">
              <label className="pagos-label">Observaciones / Notas Adicionales</label>
              <textarea
                className="pagos-textarea"
                rows={2}
                placeholder="Detalla cualquier acuerdo, plazo, número de guía asociada o condición de este pago..."
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                disabled={!tieneOCAMHabilitada}
                style={{ borderRadius: 0 }}
              />
            </div>
          </div>
        </section>

        {/* BLOQUE 3: Adjuntar Captura de Pago */}
        <section className="pagos-card" style={{ borderRadius: 0, opacity: tieneOCAMHabilitada ? 1 : 0.6 }}>
          <div className="pagos-card__header">
            <span className="pagos-card__badge" style={{ background: `${roleAccent}1a`, color: roleAccent, borderRadius: 0 }}>
              Paso 3
            </span>
            <div className="pagos-card__titles">
              <h3>Captura de Pago / Voucher <span className="req">*</span></h3>
              <p>Arrastra, selecciona o presiona Ctrl+V para pegar la captura del comprobante</p>
            </div>
          </div>

          <div className="pagos-card__body">
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              accept="image/*,.pdf,application/pdf"
              onChange={handleFileChange}
              disabled={!tieneOCAMHabilitada}
            />

            {!archivo ? (
              <div
                className={`pagos-dropzone ${isDragging ? 'pagos-dropzone--active' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => {
                  if (tieneOCAMHabilitada) fileInputRef.current?.click();
                }}
                style={{ borderRadius: 0, cursor: tieneOCAMHabilitada ? 'pointer' : 'not-allowed' }}
              >
                <div className="pagos-dropzone__icon">
                  <GoogleIcon name="cloud_upload" size={44} color="#3b82f6" />
                </div>
                <h4>Arrastra aquí la captura del pago / voucher o haz clic para examinar</h4>
                <p>
                  Soporta formatos <strong>PNG, JPG, WEBP y PDF</strong> hasta 15MB.
                </p>
                <div className="pagos-dropzone__hint">
                  <GoogleIcon name="content_paste" size={16} color="#64748b" />
                  <span>Tip: También puedes capturar tu pantalla (Windows + Shift + S) y pegarla directamente con <strong>Ctrl + V</strong></span>
                </div>
              </div>
            ) : (
              <div className="pagos-preview-card" style={{ borderRadius: 0 }}>
                <div className="pagos-preview-card__img-wrap" style={{ borderRadius: 0 }}>
                  {archivo.type === 'application/pdf' || archivo.name.toLowerCase().endsWith('.pdf') ? (
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '100%',
                        background: '#fef2f2',
                        color: '#dc2626',
                        gap: 6,
                        padding: 12,
                      }}
                    >
                      <GoogleIcon name="picture_as_pdf" size={42} color="#dc2626" />
                      <span style={{ fontSize: '11px', fontWeight: 800 }}>DOCUMENTO PDF</span>
                    </div>
                  ) : (
                    previewUrl && <img src={previewUrl} alt="Vista previa de captura" />
                  )}
                </div>
                <div className="pagos-preview-card__info">
                  <div className="pagos-preview-card__name">
                    <GoogleIcon
                      name={archivo.type === 'application/pdf' || archivo.name.toLowerCase().endsWith('.pdf') ? 'picture_as_pdf' : 'image'}
                      size={20}
                      color={archivo.type === 'application/pdf' || archivo.name.toLowerCase().endsWith('.pdf') ? '#dc2626' : '#10b981'}
                    />
                    <strong>{archivo.name}</strong>
                  </div>
                  <span className="pagos-preview-card__size">
                    {(archivo.size / 1024).toFixed(1)} KB · {archivo.type || (archivo.name.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg')}
                  </span>
                  <div className="pagos-preview-card__actions">
                    <button
                      type="button"
                      className="pagos-btn pagos-btn--sm pagos-btn--outline"
                      onClick={() => fileInputRef.current?.click()}
                      style={{ borderRadius: 0 }}
                    >
                      <GoogleIcon name="sync" size={16} />
                      <span>Cambiar captura</span>
                    </button>
                    <button
                      type="button"
                      className="pagos-btn pagos-btn--sm pagos-btn--danger-outline"
                      onClick={handleClearFile}
                      style={{ borderRadius: 0 }}
                    >
                      <GoogleIcon name="delete" size={16} />
                      <span>Quitar</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Barra de Acciones con Validación */}
        <div className="pagos-form-actions">
          {onCancelar && (
            <button type="button" className="pagos-btn pagos-btn--secondary" onClick={onCancelar} style={{ borderRadius: 0 }}>
              Cancelar
            </button>
          )}
          <button
            type="submit"
            className="pagos-btn pagos-btn--primary"
            disabled={isSubmitting || !tieneOCAMHabilitada || precioExcedeNegociado || excedeTechoOCAM}
            style={{
              background: (!tieneOCAMHabilitada || precioExcedeNegociado || excedeTechoOCAM) ? '#94a3b8' : roleAccent,
              borderRadius: 0,
              cursor: (!tieneOCAMHabilitada || precioExcedeNegociado || excedeTechoOCAM) ? 'not-allowed' : 'pointer',
            }}
          >
            {isSubmitting ? (
              <>
                <span className="pagos-spinner" />
                <span>Registrando solicitud de pago...</span>
              </>
            ) : (
              <>
                <GoogleIcon name={!tieneOCAMHabilitada ? 'lock' : 'check_circle'} size={19} color="#fff" />
                <span>
                  {!tieneOCAMHabilitada
                    ? 'Bloqueado (Falta OCAM de Perú Compras)'
                    : precioExcedeNegociado
                      ? 'Bloqueado (Precio Excede Negociado)'
                      : excedeTechoOCAM
                        ? 'Bloqueado (Excede Techo OCAM)'
                        : 'Solicitar Pago'}
                </span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
