# Report.md — WorkCalendar Excel Report Feature

> อ่านไฟล์นี้ก่อนสร้าง Report ทุกครั้ง
> ระบบต้องสามารถแสดงผลและ Export รายงานที่มีหน้าตาเหมือน Excel ต้นฉบับ

---

## 1. ที่มาของ Report

Excel ต้นแบบคือ `2026 SDP Work Plan / Work Schedule`
ใช้ในองค์กรเพื่อวางแผนงานรายปี แบ่งเป็น 2 ชั้น:

- **Plan row** — สิ่งที่วางแผนจะทำ (Manager กำหนด)
- **Act row** — สิ่งที่ทำจริง (Officer อัปเดต)

แต่ละ Task มี 2 แถวใน Excel เสมอ:
```
Row A: [No] [Task Name] [Owner] [Person] [Freq] [Plan] [Jan-W1][Jan-W2]...[Dec-W4] [Status] [Remarks]
Row B: (same No/Name empty)                     [Act]  [Jan-W1][Jan-W2]...[Dec-W4]
```

---

## 2. โครงสร้าง Excel (Column Mapping)

| Column | Field | หมายเหตุ |
|--------|-------|----------|
| A | No / Task No | ตัวเลข หรือ Section header (Roman numeral) |
| B | Task Name | ชื่องาน |
| C | Owner / Department | SDP, GPS, E-Seal, Software, HR, CCTV, infra |
| D | Person | ชื่อคนรับผิดชอบ |
| E | Frequency | Monthly / Weekly / Daily / Annually |
| F | Plan or Act | "Plan" = แถวแผน, "Act" = แถวทำจริง |
| G–BD | Jan-W1 → Dec-W4 | 48 columns (12 months × 4 weeks) ค่า = "X" ถ้า schedule ไว้ |
| BE | Status | Open / Closed / In-Progress |
| BF | Remarks | หมายเหตุ |

**Column mapping ละเอียด (G=col7 ถึง BD=col56):**
```
Col 7–10   = Jan W1–W4
Col 11–14  = Feb W1–W4
Col 15–18  = Mar W1–W4
Col 19–22  = Apr W1–W4
Col 23–26  = May W1–W4
Col 27–30  = Jun W1–W4
Col 31–34  = Jul W1–W4
Col 35–38  = Aug W1–W4
Col 39–42  = Sep W1–W4
Col 43–46  = Oct W1–W4
Col 47–50  = Nov W1–W4
Col 51–54  = Dec W1–W4
```

---

## 3. Sections (หมวดงาน)

Excel แบ่งงานเป็น Section โดยใช้แถว header แบบ Roman numeral:

| Section | ชื่อ | Department Code |
|---------|------|-----------------|
| I | SDP Management / Leading Program | SDP |
| II | GPS | GPS |
| III | E-SEAL | E-Seal |
| IV | Infrastructure / CCTV | infra, CCTV |
| VI | Software | Software |
| VII | SDP HR / Administration | HR |

> **Mapping กับ Database:** Section = `Department` หรือ `owner` field ใน PlanTask

---

## 4. Task Data ตัวอย่างจาก Excel จริง

### Section I — SDP Management
| No | Task | Person | Freq | Schedule |
|----|------|--------|------|----------|
| 1 | จัดทำ Business plan SDP 2026 | Chan | Monthly | Jan-W3, Feb-W3, Mar-W3 |
| 2 | จัดทำ Business plan STI 2026 | Chan | Monthly | Mar-W4, Apr-W4, May-W4 |
| 3 | Surveillance ISO 29110 | Apisit | Monthly | Mar-W2, Apr-W2, May-W2 |
| 4 | จัดทำ Business plan Datacenter 2026 | Kittichai | Monthly | Jan-W4–Apr-W4 |
| 5–8 | ISO 270001, จัดตั้งบริษัท, Booklet | Various | Monthly | (TBD) |

### Section II — GPS
| No | Task | Person | Freq |
|----|------|--------|------|
| 9 | เป็นตัวแทนจำหน่าย GPS | ສົມສະນິດ | Monthly |
| 10 | สร้างแบรนด์สุดาพอนฯ | ສົມສະນິດ | Monthly |
| 12 | พัฒนาระบบ GPS/TMS | ສົມສະນິດ | Monthly |

### Section VI — Software
| No | Task | Person | Freq |
|----|------|--------|------|
| 24 | พัฒนาโครงการ Dvet | Suriya | Monthly |
| 25 | พัฒนาโครงการ Logistics Pro | Apisit | Monthly |
| 28 | พัฒนาโครงการ Smart ERP | Chan | Monthly |
| 32 | Implement ระบบ SAP [STL BLT] | Chan | Monthly |

---

## 5. Report ที่ต้องสร้าง

### 5.1 Annual Work Plan Report (หน้าหลัก)

ดูเหมือน Excel ต้นแบบ — Gantt-style grid

**Layout:**
```
Header: "[Year] Work Plan / Work Schedule"
Sub-header: Prepared by | Checked by | Approval by | Date

Table:
| No | Task | Owner | Person | Freq | P/A | Jan          | Feb          | ... | Dec          | Status | Remarks |
|    |      |       |        |      |     | W1 W2 W3 W4  | W1 W2 W3 W4  |     | W1 W2 W3 W4  |        |         |
|----+------+-------+--------+------+-----+--------------+--------------+-----+--------------+--------+---------|
| I. SDP Management/Leading Program (section row, merged, colored)                                               |
| 1  | Task | SDP   | Chan   |Monthly| Plan| ·  ·  X  ·  | ·  ·  X  ·  |     |              | Open   |         |
|    |      |       |        |      | Act | ·  ·  ·  ·  | ·  ·  ·  ·  |     |              |        |         |
```

**Cell rules:**
- `X` in Plan row = ■ filled square (primary color)
- `X` in Act row = ■ filled square (secondary/green color)
- Empty = · dot or blank
- Section header row = full-width merged cell, colored background
- Plan row + Act row = pair per task (always together)

---

### 5.2 Report Filters (Query Parameters)
```
?year=2026
?section=SDP|GPS|Software|HR|CCTV|E-Seal
?owner=Chan|Apisit|...
?status=Open|Closed
?month=1-12        ← show only selected months
?view=full|summary
```

---

### 5.3 Summary Dashboard Report

สรุปต่อ Section:
```
Section         | Total Tasks | Planned | Actual Done | Compliance %
----------------|-------------|---------|-------------|-------------
SDP Management  |      8      |   15    |      8      |    53%
GPS             |      6      |    0    |      0      |     0%
Software        |      9      |    0    |      5      |    —
HR/Admin        |      5      |    0    |      2      |    —
```

---

### 5.4 Individual Task Report (drill-down)

เมื่อ click task จาก grid:
```
Task: จัดทำ Business plan SDP 2026
Owner: SDP | Person: Chan | Frequency: Monthly
Status: Open

Timeline:
  Jan W3 → Plan ✓ | Act ✗ (missed)
  Feb W3 → Plan ✓ | Act ✓ (done)
  Mar W3 → Plan ✓ | Act ✓ (done)

Compliance: 2/3 = 67%

History of Actuals:
  2026-02-20 | 100% | DONE | "Submitted on time"
  2026-03-21 | 100% | DONE | "Completed"
```

---

## 6. Data Mapping (Excel → Database)

| Excel Field | Database Field | Model |
|-------------|----------------|-------|
| Section (Roman) | department.name / planTask.owner | Department |
| Task Name | planTask.taskName | PlanTask |
| Owner (dept code) | planTask owner column | PlanTask |
| Person | user.firstName + lastName | User (assignedTo) |
| Frequency | planTask.recurrenceType | PlanTask |
| "X" in Plan row + week | planTask schedule marks | PlanTask (new field) |
| "X" in Act row + week | taskActual.actualDate | TaskActual |
| Status | planTask.status | PlanTask |
| Remarks | planTask.description | PlanTask |

**New field needed in PlanTask:**
```prisma
// Store which weeks are planned as JSON string
// e.g. '["Jan-W1","Mar-W3","Jun-W2"]'
plannedWeeks  String?  @map("planned_weeks") @db.NVarChar(Max)
```

---

## 7. Export Feature

Report ต้องสามารถ Export ได้:

| Format | ใช้ Library | หมายเหตุ |
|--------|-------------|----------|
| Excel (.xlsx) | `xlsx` (SheetJS) | ทำ layout เหมือนต้นแบบเลย |
| PDF | `@nuxtjs/pdf` หรือ browser print | landscape A3 |
| Print | CSS @media print | hide sidebar/buttons |

**Excel Export spec:**
- Row 1: Title merged
- Row 2: Prepared by / Checked by / Approval by
- Row 3: blank
- Row 4: Date
- Row 5–6: Header (merged month cells + W1–W4)
- Row 7+: Section headers + task pairs (Plan/Act)
- Cells with X: fill color `#1e3a5f` (Plan) / `#22c55e` (Act)
- Section row: fill color `#dbeafe` (light blue)

---

## 8. API Endpoints ที่ต้องสร้าง
```
GET  /api/reports/work-plan
     ?year=&section=&owner=&month=&status=
     → ส่ง structured data สำหรับ render grid

GET  /api/reports/work-plan/export
     ?year=&format=xlsx|pdf
     → stream file download

GET  /api/reports/work-plan/summary
     ?year=
     → section summary + compliance stats
```

**Response structure สำหรับ grid:**
```ts
{
  meta: {
    title: "2026 SDP Work Plan",
    year: 2026,
    preparedBy: "Chan Neeammart",
    date: "09 Mar 2026"
  },
  sections: [
    {
      id: "SDP",
      name: "I. SDP Management / Leading Program",
      tasks: [
        {
          no: 1,
          taskName: "จัดทำ Business plan SDP 2026",
          owner: "SDP",
          person: "Chan",
          frequency: "Monthly",
          status: "Open",
          remarks: "",
          planWeeks: ["Jan-W3","Feb-W3","Mar-W3"],   // X in Plan row
          actWeeks:  ["Feb-W3","Mar-W3"]              // X in Act row (from TaskActuals)
        }
      ]
    }
  ]
}
```

---

## 9. UI Component ที่ต้องสร้าง
```
app/components/report/
  WorkPlanGrid.vue       ← ตาราง Gantt grid หลัก
  WorkPlanCell.vue       ← 1 cell (W1-W4 per month)
  SectionRow.vue         ← แถว header ของแต่ละ section
  TaskRow.vue            ← คู่แถว Plan+Act ของ 1 task
  ReportFilters.vue      ← filter bar (year, section, person)
  ExportButton.vue       ← ปุ่ม Export xlsx/pdf
  SummaryTable.vue       ← ตารางสรุป compliance per section

app/pages/reports/
  work-plan.vue          ← หน้า report หลัก
```

---

## 10. Visual Design Reference

จาก Excel ต้นแบบ สิ่งที่ต้องสังเกต:

- **สีหัวตาราง:** พื้นหลังเข้ม ตัวอักษรขาว
- **Section row:** พื้นหลังสี (ต่างกันต่อ section)
- **Plan row:** แถวบน — X แสดงด้วยสี primary
- **Act row:** แถวล่าง — X แสดงด้วยสีเขียว
- **ความกว้าง cell:** แต่ละ week cell แคบมาก (~20px)
- **Freeze pane:** columns A–F (No, Task, Owner, Person, Freq, P/A) ค้างอยู่เมื่อ scroll ข้าง
- **Mobile:** แสดงแบบ summary (ไม่แสดง full grid) เนื่องจาก 48 columns กว้างเกิน
