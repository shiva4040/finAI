from io import BytesIO
from decimal import Decimal
from typing import Any
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from app.utils.money import format_currency_inr


def generate_invoice_pdf(invoice: Any, customer: Any = None) -> bytes:
    """
    Generates a professional, branded PDF invoice using ReportLab.
    """
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "InvoiceTitle",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=24,
        textColor=colors.HexColor("#4f46e5"),
        spaceAfter=4
    )
    subtitle_style = ParagraphStyle(
        "InvoiceSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=10,
        textColor=colors.HexColor("#64748b")
    )
    heading_style = ParagraphStyle(
        "InvoiceHeading",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=12,
        textColor=colors.HexColor("#1e293b"),
        spaceAfter=6
    )
    body_style = ParagraphStyle(
        "InvoiceBody",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        textColor=colors.HexColor("#334155")
    )
    bold_body_style = ParagraphStyle(
        "InvoiceBodyBold",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=9,
        textColor=colors.HexColor("#0f172a")
    )

    elements = []

    # 1. Header & Branding
    header_data = [
        [
            Paragraph("FinAI", title_style),
            Paragraph(f"<b>INVOICE:</b> {invoice.invoice_number}<br/><b>Status:</b> {invoice.status.upper()}", body_style)
        ],
        [
            Paragraph("AI-Powered Financial Intelligence Platform", subtitle_style),
            Paragraph(f"<b>Issue Date:</b> {invoice.issue_date}<br/><b>Due Date:</b> {invoice.due_date}", body_style)
        ]
    ]
    header_table = Table(header_data, colWidths=[340, 200])
    header_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ALIGN", (1, 0), (1, -1), "RIGHT"),
    ]))
    elements.append(header_table)
    elements.append(Spacer(1, 15))
    elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#e2e8f0"), spaceAfter=15))

    # 2. Bill To & Customer Info
    cust_name = customer.name if customer else (getattr(invoice, "customer", None).name if getattr(invoice, "customer", None) else "Valued Customer")
    cust_company = customer.company if customer and customer.company else ""
    cust_email = customer.email if customer and customer.email else ""
    cust_tax = f"Tax/GSTIN: {customer.tax_number}" if customer and customer.tax_number else ""

    cust_details = [f"<b>{cust_name}</b>"]
    if cust_company:
        cust_details.append(cust_company)
    if cust_email:
        cust_details.append(cust_email)
    if cust_tax:
        cust_details.append(cust_tax)

    bill_to_data = [
        [Paragraph("<b>Billed To:</b>", heading_style), Paragraph("<b>Payment Currency:</b>", heading_style)],
        [Paragraph("<br/>".join(cust_details), body_style), Paragraph(f"<b>{invoice.currency}</b> (INR)", body_style)]
    ]
    bill_table = Table(bill_to_data, colWidths=[340, 200])
    bill_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))
    elements.append(bill_table)
    elements.append(Spacer(1, 20))

    # 3. Line Items Table
    table_headers = ["Description", "Qty", "Unit Price", "Tax %", "Discount", "Total"]
    table_rows = [[Paragraph(f"<b>{h}</b>", bold_body_style) for h in table_headers]]

    for item in invoice.items:
        row = [
            Paragraph(item.description, body_style),
            f"{item.quantity:.2f}",
            format_currency_inr(item.unit_price),
            f"{item.tax_rate:.1f}%",
            format_currency_inr(item.discount_amount),
            format_currency_inr(item.total)
        ]
        table_rows.append(row)

    items_table = Table(table_rows, colWidths=[190, 50, 75, 55, 75, 95])
    items_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f8fafc")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#1e293b")),
        ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    elements.append(items_table)
    elements.append(Spacer(1, 15))

    # 4. Financial Summary Block
    summary_data = [
        ["Subtotal:", format_currency_inr(invoice.subtotal)],
        ["Tax Total:", format_currency_inr(invoice.tax_total)],
        ["Discount Total:", f"-{format_currency_inr(invoice.discount_total)}"],
        ["Grand Total:", format_currency_inr(invoice.total)],
        ["Amount Paid:", format_currency_inr(invoice.amount_paid)],
        ["Balance Due:", format_currency_inr(invoice.balance_due)]
    ]
    summary_table = Table(summary_data, colWidths=[120, 100])
    summary_table.setStyle(TableStyle([
        ("ALIGN", (0, 0), (-1, -1), "RIGHT"),
        ("TEXTCOLOR", (0, 0), (-1, -1), colors.HexColor("#334155")),
        ("LINEBELOW", (0, 3), (1, 3), 1, colors.HexColor("#4f46e5")),
        ("FONTNAME", (0, 3), (1, 3), "Helvetica-Bold"),
        ("FONTNAME", (0, 5), (1, 5), "Helvetica-Bold"),
        ("TEXTCOLOR", (0, 5), (1, 5), colors.HexColor("#dc2626") if invoice.balance_due > 0 else colors.HexColor("#16a34a")),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))

    align_summary = Table([["", summary_table]], colWidths=[320, 220])
    align_summary.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP")]))
    elements.append(align_summary)

    # 5. Notes & Footer
    if invoice.notes:
        elements.append(Spacer(1, 20))
        elements.append(Paragraph("<b>Notes / Terms:</b>", heading_style))
        elements.append(Paragraph(invoice.notes, body_style))

    doc.build(elements)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes


def generate_report_pdf(
    title: str,
    headers: list,
    rows: list,
    field_keys: list,
    metrics: dict,
    currency: str = "INR"
) -> bytes:
    """
    Generates a clean, branded PDF report with summary metrics and data table.
    """
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "ReportTitle",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=20,
        textColor=colors.HexColor("#4f46e5"),
        spaceAfter=4
    )
    body_style = ParagraphStyle(
        "ReportBody",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        textColor=colors.HexColor("#334155")
    )
    bold_body_style = ParagraphStyle(
        "ReportBodyBold",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=9,
        textColor=colors.HexColor("#0f172a")
    )

    elements = []

    # Title & Metadata
    elements.append(Paragraph(title, title_style))
    from datetime import datetime
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    elements.append(Paragraph(f"Generated by FinAI • {now_str} • Currency: {currency}", body_style))
    elements.append(Spacer(1, 10))
    elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#e2e8f0"), spaceAfter=12))

    # Metrics Grid
    if metrics:
        metric_items = []
        for k, v in metrics.items():
            k_clean = k.replace("_", " ").title()
            val_clean = format_currency_inr(v) if isinstance(v, (Decimal, int, float)) and "count" not in k.lower() else str(v)
            metric_items.append(f"<b>{k_clean}:</b> {val_clean}")

        # Group metrics into 2-column or 3-column table
        chunks = [metric_items[i:i + 3] for i in range(0, len(metric_items), 3)]
        metric_table_data = [[Paragraph(item, body_style) for item in chunk] for chunk in chunks]
        m_table = Table(metric_table_data, colWidths=[180] * 3)
        m_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ]))
        elements.append(m_table)
        elements.append(Spacer(1, 15))

    # Data Table
    table_rows = [[Paragraph(f"<b>{h}</b>", bold_body_style) for h in headers]]
    for r in rows[:50]:  # Cap at 50 rows for legible page rendering
        row_vals = []
        for key in field_keys:
            val = r.get(key, "")
            if isinstance(val, (Decimal, float)):
                val_str = format_currency_inr(val)
            else:
                val_str = str(val)
            row_vals.append(Paragraph(val_str, body_style))
        table_rows.append(row_vals)

    col_w = max(50, int(540 / max(1, len(headers))))
    data_table = Table(table_rows, colWidths=[col_w] * len(headers))
    data_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f1f5f9")),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    elements.append(data_table)

    doc.build(elements)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes
