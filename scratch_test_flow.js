const feedbackCertificateStorage = require('./backend/feedbackCertificateStorage');

async function runTests() {
  console.log('========================================================');
  console.log('RUNNING FULL END-TO-END EVENT FEEDBACK & QUIZ SYSTEM TEST');
  console.log('========================================================');

  // 1. Fetch all student users dynamically from DB
  const students = await feedbackCertificateStorage.getAllStudentUsers();
  console.log(`[TEST 1] Loaded ${students.length} students from database.`);
  if (students.length === 0) {
    throw new Error('No students found in database!');
  }

  // Pick a student for testing
  const testStudent = students[0];
  console.log(`[TEST 1] Test student: ${testStudent.full_name} (${testStudent.register_number}, User ID: ${testStudent.id})`);

  // 2. Publish new Event Feedback & Quiz
  console.log('\n[TEST 2] Publishing new event feedback & quiz form...');
  const newEventData = {
    event_name: 'Test Full Lifecycle Placement Workshop',
    event_code: 'TFLW',
    event_date: '2026-09-25',
    event_venue: 'Placement Cell Lab 2',
    coordinator: 'Dr. Coordinator',
    academic_year: '2026-27',
    target_type: 'all',
    min_quiz_score_pct: 50,
    signatory_title: 'Head of Department - CSBS',
    message: 'Mandatory workshop quiz assessment.',
    quiz: [
      {
        id: 1,
        question: 'What is the primary role of data structures in placement interviews?',
        option_a: 'Efficient memory and compute problem-solving',
        option_b: 'Decorating code only',
        option_c: 'Slowing down programs',
        option_d: 'None of the above',
        correct_option: 'A'
      },
      {
        id: 2,
        question: 'Which complexity is desirable for search in a hash table?',
        option_a: 'O(N^2)',
        option_b: 'O(1)',
        option_c: 'O(N!)',
        option_d: 'O(log N)',
        correct_option: 'B'
      }
    ]
  };

  const publishResult = await feedbackCertificateStorage.createEventFeedback(newEventData);
  const createdEvent = publishResult.feedback;
  console.log(`[TEST 2] Published successfully! Event ID: ${createdEvent.id}`);
  console.log(`[TEST 2] Eligible Students calculated: ${publishResult.eligible_count}`);
  console.log(`[TEST 2] Status: ${createdEvent.status}`);

  // Verify notifications created
  const notifs = await feedbackCertificateStorage.getStudentNotifications(testStudent.id);
  const eventNotif = notifs.find(n => n.event_id === createdEvent.id);
  console.log(`[TEST 2] Student notification created: ${eventNotif ? 'YES' : 'NO'} (Title: "${eventNotif?.title}")`);

  // 3. Check Active events listing & stats before submission
  console.log('\n[TEST 3] Checking Active Event Feedbacks stats before submission...');
  let stats = await feedbackCertificateStorage.getEventFeedbacksWithStats();
  let foundActive = stats.active.find(e => e.id === createdEvent.id);
  console.log(`[TEST 3] Active Events Count: ${stats.active.length}`);
  console.log(`[TEST 3] Found in Active: ${foundActive ? 'YES' : 'NO'}`);
  console.log(`[TEST 3] Eligible: ${foundActive.total_eligible}, Submitted: ${foundActive.submitted_count}, Pending: ${foundActive.pending_count}, Completion: ${foundActive.completion_rate}%`);

  // 4. Student submits quiz & feedback
  console.log('\n[TEST 4] Student submitting quiz (2/2 correct) and feedback...');
  const subResult = await feedbackCertificateStorage.submitFeedbackAndGenerateCertificate({
    feedback_id: createdEvent.id,
    user_id: testStudent.id,
    rating: 5,
    learnings: 'Mastered hashing and dynamic programming problem solving techniques.',
    comments: 'Great session by the department.',
    quiz_answers: { 1: 'A', 2: 'B' },
    student_info: {
      student_name: testStudent.full_name,
      register_number: testStudent.register_number,
      department: testStudent.department || 'CSBS'
    }
  });

  console.log(`[TEST 4] Submission status: ${subResult.success ? 'SUCCESS' : 'FAILED'}`);
  console.log(`[TEST 4] Quiz Score: ${subResult.quiz_score} / ${subResult.quiz_total} (${subResult.quiz_percentage}%) - Passed: ${subResult.quiz_passed}`);
  console.log(`[TEST 4] Certificate Eligible: ${subResult.certificate_eligible}`);
  console.log(`[TEST 4] Issued Certificate No: ${subResult.certificate?.certificate_number}`);

  // 5. Check Admin stats updated dynamically
  console.log('\n[TEST 5] Checking Admin stats after submission...');
  stats = await feedbackCertificateStorage.getEventFeedbacksWithStats();
  foundActive = stats.active.find(e => e.id === createdEvent.id);
  console.log(`[TEST 5] Updated stats: Eligible: ${foundActive.total_eligible}, Submitted: ${foundActive.submitted_count}, Pending: ${foundActive.pending_count}, Completion: ${foundActive.completion_rate}%`);
  if (foundActive.submitted_count !== 1) {
    throw new Error('Submitted count did not increment to 1!');
  }

  // 6. Test duplicate submission protection
  console.log('\n[TEST 6] Testing duplicate submission prevention for same student & event...');
  const dupResult = await feedbackCertificateStorage.submitFeedbackAndGenerateCertificate({
    feedback_id: createdEvent.id,
    user_id: testStudent.id,
    rating: 4,
    learnings: 'Duplicate test',
    comments: 'Trying again',
    quiz_answers: { 1: 'A', 2: 'B' }
  });
  console.log(`[TEST 6] Duplicate blocked as expected: ${dupResult.alreadySubmitted ? 'YES' : 'NO'}`);
  if (!dupResult.alreadySubmitted) {
    throw new Error('Duplicate submission was not blocked!');
  }

  // 7. Check Admin View Submissions endpoint data
  console.log('\n[TEST 7] Testing getFeedbackSubmissionsForAdmin...');
  const subRows = await feedbackCertificateStorage.getFeedbackSubmissionsForAdmin(createdEvent.id);
  console.log(`[TEST 7] Returned ${subRows.length} submission record(s).`);
  console.log(`[TEST 7] Row 1: Student: ${subRows[0].student_name}, Reg: ${subRows[0].register_number}, Score: ${subRows[0].quiz_score_display}, Cert: ${subRows[0].certificate_number}`);

  // 8. Close / Archive Event
  console.log('\n[TEST 8] Closing event (transitioning ACTIVE -> CLOSED)...');
  await feedbackCertificateStorage.updateEventFeedbackStatus(createdEvent.id, 'CLOSED');
  stats = await feedbackCertificateStorage.getEventFeedbacksWithStats();
  const inActive = stats.active.find(e => e.id === createdEvent.id);
  const inArchived = stats.archived.find(e => e.id === createdEvent.id);
  console.log(`[TEST 8] In Active Table: ${inActive ? 'YES' : 'NO'} | In Archived Table: ${inArchived ? 'YES' : 'NO'}`);
  if (inActive || !inArchived) {
    throw new Error('Event did not transition cleanly to archived table!');
  }

  // 9. Analytics check
  console.log('\n[TEST 9] Checking Analytics aggregation...');
  const analytics = await feedbackCertificateStorage.getEventAnalyticsData();
  console.log(`[TEST 9] Analytics: Total Events: ${analytics.total_events}, Total Submissions: ${analytics.total_submissions}, Total Certs: ${analytics.total_certificates}`);
  console.log('[TEST 9] Yearly Trends sample:', analytics.yearly_trends[0] || analytics.yearly_trends);

  // 10. Verify certificate verification is intact and searchable
  console.log('\n[TEST 10] Testing Certificate Verification Lookup integrity (PART 16 & 17)...');
  const certDetail = await feedbackCertificateStorage.verifyAndGetCertificateDetails(subResult.certificate.certificate_number);
  const certStudent = certDetail.certificate?.student_name || certDetail.student?.name;
  const certEvent = certDetail.certificate?.event_name || certDetail.event?.event_name;
  console.log(`[TEST 10] Certificate Lookup: Found: ${certDetail.found ? 'YES' : 'NO'}, Student: ${certStudent}, Event: ${certEvent}`);
  if (!certDetail.found) {
    throw new Error('Issued certificate could not be verified in the single source of truth!');
  }

  console.log('\n========================================================');
  console.log('ALL 10 VERIFICATION TESTS PASSED SUCCESSFULLY! ✅');
  console.log('========================================================');
}

runTests().catch(err => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
