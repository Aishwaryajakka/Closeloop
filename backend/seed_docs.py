import asyncio
import io
import uuid
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer

import server as s


def build_pdf(title, sections):
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=LETTER, topMargin=0.9 * inch, bottomMargin=0.9 * inch)
    styles = getSampleStyleSheet()
    h1 = ParagraphStyle("h1", parent=styles["Title"], fontSize=20, spaceAfter=14)
    h2 = ParagraphStyle("h2", parent=styles["Heading2"], fontSize=13, spaceBefore=10, spaceAfter=6)
    body = ParagraphStyle("body", parent=styles["BodyText"], fontSize=10.5, leading=15, spaceAfter=6)
    story = [Paragraph(title, h1), Paragraph("Rivergate Commons &mdash; Resident Policy", styles["Italic"]), Spacer(1, 12)]
    for heading, paras in sections:
        story.append(Paragraph(heading, h2))
        for p in paras:
            story.append(Paragraph(p, body))
    doc.build(story)
    return buf.getvalue()


DOCS = [
    {
        "name": "Parking Policy",
        "doc_type": "Parking Policy",
        "title": "Parking Policy",
        "sections": [
            ("1. Assigned Parking", [
                "Each leased unit is entitled to one (1) assigned covered parking space. The space number is listed on your lease addendum.",
                "Parking in a space assigned to another resident may result in the vehicle being towed at the owner's expense.",
            ]),
            ("2. Guest Parking", [
                "Guest parking is available in the marked visitor stalls near the leasing office on a first-come, first-served basis.",
                "Guests may park in visitor stalls for up to 48 consecutive hours. Overnight guests staying longer must register the vehicle with the leasing office.",
            ]),
            ("3. Prohibited Vehicles", [
                "Inoperable vehicles, trailers, boats, and RVs are not permitted in the community without prior written approval.",
                "Vehicles leaking fluids must be repaired within 72 hours or removed from the property.",
            ]),
            ("4. Electric Vehicle Charging", [
                "EV charging is available at designated stations in the north garage. Charging sessions are limited to 4 hours during peak times (5pm-9pm).",
            ]),
        ],
    },
    {
        "name": "Pet Policy",
        "doc_type": "Pet Policy",
        "title": "Pet Policy",
        "sections": [
            ("1. Registration", [
                "All pets must be registered with the leasing office and listed on a signed pet addendum before moving in.",
                "A one-time non-refundable pet fee of $300 and monthly pet rent of $35 per pet applies.",
            ]),
            ("2. Limits & Breeds", [
                "A maximum of two (2) pets per unit is allowed. Combined weight may not exceed 100 lbs.",
                "Certain restricted breeds are not permitted. Contact the leasing office for the current list.",
            ]),
            ("3. Common Areas", [
                "Pets must be leashed at all times in hallways, elevators, and outdoor common areas.",
                "Owners must promptly clean up after their pets. Pet waste stations are located at each building entrance.",
            ]),
            ("4. Noise & Nuisance", [
                "Excessive barking or aggressive behavior may result in a written notice and, if unresolved, removal of the pet.",
            ]),
        ],
    },
    {
        "name": "Amenity Rules",
        "doc_type": "Amenity Rules",
        "title": "Amenity Rules",
        "sections": [
            ("1. Pool & Hot Tub", [
                "Pool hours are 8:00 AM to 10:00 PM daily. Children under 14 must be accompanied by an adult.",
                "Glass containers are prohibited in the pool area. No lifeguard is on duty; swim at your own risk.",
            ]),
            ("2. Fitness Center", [
                "The fitness center is accessible 24/7 with your key fob. Please wipe down equipment after use.",
                "Guests must be accompanied by a resident and are limited to two per unit.",
            ]),
            ("3. Clubhouse Reservations", [
                "The clubhouse may be reserved for private events through the resident portal with 72 hours notice.",
                "A refundable $150 cleaning deposit is required. Events must end by 11:00 PM.",
            ]),
            ("4. Package Room", [
                "Packages are held in the secure package room. Residents receive a pickup code by text and email.",
                "Packages not retrieved within 7 days may be returned to sender.",
            ]),
        ],
    },
    {
        "name": "Maintenance & Emergency Procedures",
        "doc_type": "Emergency Procedures",
        "title": "Maintenance & Emergency Procedures",
        "sections": [
            ("1. Routine Maintenance Requests", [
                "Submit non-urgent requests through the resident portal. Standard requests are addressed within 2-3 business days.",
                "Please secure pets and clear the work area before the scheduled visit.",
            ]),
            ("2. Emergency Maintenance", [
                "Emergencies include: no heat/AC in extreme weather, major water leaks, gas odor, no electricity, or being locked out.",
                "For emergencies, call the 24-hour maintenance line at (512) 555-0142. Do not submit emergencies through the portal.",
            ]),
            ("3. Fire & Life Safety", [
                "In case of fire, activate the nearest pull station, evacuate using the stairs (never the elevator), and call 911.",
                "Test smoke detectors monthly. Report a chirping or non-functioning detector immediately.",
            ]),
            ("4. Water Leak Response", [
                "If you discover a major leak, shut off the fixture valve if safe to do so and call the emergency line.",
                "Move valuables away from the affected area to reduce damage while help is on the way.",
            ]),
        ],
    },
]


async def run():
    prop = await s.db.properties.find_one({}, {"_id": 0})
    if not prop:
        print("No property found. Run seed.py first.")
        return
    await s.db.property_documents.delete_many({})
    await s.db.document_chunks.delete_many({})
    s.init_storage()

    for d in DOCS:
        data = build_pdf(d["title"], d["sections"])
        path = f"{s.APP_NAME}/{prop['id']}/{uuid.uuid4()}.pdf"
        result = s.put_object(path, data, "application/pdf")
        doc = s.PropertyDocument(
            property_id=prop["id"],
            name=d["name"],
            doc_type=d["doc_type"],
            storage_path=result["path"],
            original_filename=f"{d['name'].replace(' ', '_').replace('&', 'and')}.pdf",
            content_type="application/pdf",
            size=result.get("size", len(data)),
            uploaded_by="System Seed",
        )
        await s.db.property_documents.insert_one(doc.model_dump())
        await s.process_document(doc.id, data, "pdf")
        stored = await s.db.property_documents.find_one({"id": doc.id}, {"_id": 0})
        print(f"Seeded '{d['name']}' -> status={stored['processing_status']} chunks={stored['chunk_count']}")

    s.client.close()


if __name__ == "__main__":
    asyncio.run(run())
