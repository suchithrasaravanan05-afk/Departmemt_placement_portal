const { sendSingleCertificateEmail } = require("../backend/services/emailService");

async function testLiveEmail() {
    console.log("Sending sample certificate email to rajakaleeswaranhari1976@gmail.com...");
    
    const sampleCert = {
        certificate_number: "RIT-TEST-EMAIL-001",
        participant_name: "Keerthana Mohan",
        student_name: "Keerthana Mohan",
        programme_title: "One Week Short-Term Training Programme (STTP)",
        event_name: "Emerging Blockchain Technologies – Architectures, Applications and Research Perspectives",
        department: "Department of Computer Science and Business Systems",
        college_name: "Ramco Institute of Technology, Rajapalayam",
        institution: "Ramco Institute of Technology, Rajapalayam",
        programme_dates: "October 12, 2026, to October 18, 2026",
        student_email: "rajakaleeswaranhari1976@gmail.com",
        signatory_1_name: "Dr. M. Jeya Sundari",
        signatory_2_name: "M. Rekha",
        signatory_3_name: "M. Ramakrishnan",
        signatory_4_name: "Dr. D. Kesavaraja",
        signatory_5_name: "Dr. S. Rajakarunakaran",
        signatory_6_name: "Dr. L. Ganesan"
    };

    const res = await sendSingleCertificateEmail(sampleCert, "rajakaleeswaranhari1976@gmail.com");
    console.log("✅ Email Dispatch Success Result:", res);
}

testLiveEmail().catch(err => {
    console.error("❌ Email Dispatch Error:", err);
});
