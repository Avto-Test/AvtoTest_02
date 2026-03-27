import { apiRequest } from "@/api/client";
import type {
  AdminAnalyticsSummary,
  AdminExperimentSummary,
  AdminFinanceRange,
  AdminGrowthRange,
  AdminGrowthSummary,
  AdminPaymentSummary,
  AdminAnswerOption,
  AdminAnswerOptionPayload,
  AdminBillingData,
  AdminContentData,
  AdminDashboardData,
  AdminDrivingInstructorApplicationPayload,
  AdminDrivingInstructorComplaintPayload,
  AdminDrivingInstructorMediaPayload,
  AdminDrivingInstructorPayload,
  AdminDrivingInstructorPromoStatsItem,
  AdminDrivingInstructorRegistrationSettingsPayload,
  AdminDrivingInstructorReviewPayload,
  AdminDrivingInstructorLeadPayload,
  AdminDrivingInstructorsData,
  AdminDrivingSchoolCoursePayload,
  AdminDrivingSchoolLeadPayload,
  AdminDrivingSchoolMediaPayload,
  AdminDrivingSchoolPartnerApplicationPayload,
  AdminDrivingSchoolPayload,
  AdminDrivingSchoolPromoStatsItem,
  AdminDrivingSchoolReviewPayload,
  AdminDrivingSchoolsData,
  AdminLesson,
  AdminLessonPayload,
  AdminPaginatedQuestions,
  AdminPromoCode,
  AdminPromoCodePayload,
  AdminQuestionCategory,
  AdminQuestionCategoryPayload,
  AdminQuestionListItem,
  AdminQuestionPayload,
  AdminSimulationExamSettings,
  AdminSimulationExamSettingsPayload,
  AdminSubscriptionPlan,
  AdminSubscriptionPlanPayload,
  AdminTestDetail,
  AdminTestListItem,
  AdminTestPayload,
  AdminUploadedAsset,
  AdminUserListItem,
  AdminUserSubscriptionPayload,
  AdminUserUpdatePayload,
  AdminViolationLog,
} from "@/types/admin";
import type {
  InstructorAdminProfile,
  InstructorApplication,
  InstructorLead,
  InstructorRegistrationSettings,
  InstructorReview,
} from "@/types/instructor";
import type {
  SchoolAdminProfile,
  SchoolLead,
  SchoolMedia,
  SchoolPartnerApplication,
  SchoolReview,
} from "@/types/school";

function normalizeSchoolAdminProfile(school: SchoolAdminProfile): SchoolAdminProfile {
  return {
    ...school,
    courses: Array.isArray(school.courses) ? school.courses : [],
    media_items: Array.isArray(school.media_items) ? school.media_items : [],
    reviews: Array.isArray(school.reviews) ? school.reviews : [],
  };
}

function normalizeInstructorAdminProfile(instructor: InstructorAdminProfile): InstructorAdminProfile {
  return {
    ...instructor,
    media_items: Array.isArray(instructor.media_items) ? instructor.media_items : [],
    reviews: Array.isArray(instructor.reviews) ? instructor.reviews : [],
  };
}

export function getAdminAnalyticsSummary() {
  return apiRequest<AdminAnalyticsSummary>("/admin/analytics", { method: "GET" });
}

export function getAdminFinanceSummary(range: AdminFinanceRange = "all") {
  return apiRequest<AdminPaymentSummary>("/admin/finance", {
    method: "GET",
    query: range === "all" ? undefined : { range },
  });
}

export function getAdminGrowthSummary(range: AdminGrowthRange = "all") {
  return apiRequest<AdminGrowthSummary>("/admin/growth", {
    method: "GET",
    query: range === "all" ? undefined : { range },
  });
}

export function getAdminExperimentSummary(name = "upgrade_button") {
  return apiRequest<AdminExperimentSummary>("/admin/experiments", {
    method: "GET",
    query: name === "upgrade_button" ? undefined : { name },
  });
}

export function getAdminPaymentSummary(range: AdminFinanceRange = "all") {
  return getAdminFinanceSummary(range);
}

export function getAdminUsers() {
  return apiRequest<AdminUserListItem[]>("/admin/users", { method: "GET" });
}

export function updateAdminUser(userId: string, payload: AdminUserUpdatePayload) {
  return apiRequest<AdminUserListItem>(`/admin/users/${userId}`, {
    method: "PUT",
    body: payload,
  });
}

export function updateAdminUserSubscription(userId: string, payload: AdminUserSubscriptionPayload) {
  return apiRequest<AdminUserListItem>(`/admin/users/${userId}/subscription`, {
    method: "PUT",
    body: payload,
  });
}

export function getAdminTests() {
  return apiRequest<AdminTestListItem[]>("/admin/tests", { method: "GET" });
}

export function getAdminTest(testId: string) {
  return apiRequest<AdminTestDetail>(`/admin/tests/${testId}`, { method: "GET" });
}

export function createAdminTest(payload: AdminTestPayload) {
  return apiRequest<AdminTestListItem>("/admin/tests", {
    method: "POST",
    body: payload,
  });
}

export function updateAdminTest(testId: string, payload: Partial<AdminTestPayload>) {
  return apiRequest<AdminTestListItem>(`/admin/tests/${testId}`, {
    method: "PUT",
    body: payload,
  });
}

export function deleteAdminTest(testId: string) {
  return apiRequest<null>(`/admin/tests/${testId}`, { method: "DELETE" });
}

export function getAdminLessons() {
  return apiRequest<AdminLesson[]>("/admin/lessons", { method: "GET" });
}

export function createAdminLesson(payload: AdminLessonPayload) {
  return apiRequest<AdminLesson>("/admin/lessons", {
    method: "POST",
    body: payload,
  });
}

export function updateAdminLesson(lessonId: string, payload: Partial<AdminLessonPayload>) {
  return apiRequest<AdminLesson>(`/admin/lessons/${lessonId}`, {
    method: "PUT",
    body: payload,
  });
}

export function deleteAdminLesson(lessonId: string) {
  return apiRequest<null>(`/admin/lessons/${lessonId}`, { method: "DELETE" });
}

export function uploadAdminLessonFile(file: File) {
  const body = new FormData();
  body.append("file", file);
  return apiRequest<AdminUploadedAsset>("/admin/media/lesson", {
    method: "POST",
    body,
  });
}

export function getAdminQuestionCategories() {
  return apiRequest<AdminQuestionCategory[]>("/admin/question-categories", { method: "GET" });
}

export function createAdminQuestionCategory(payload: AdminQuestionCategoryPayload) {
  return apiRequest<AdminQuestionCategory>("/admin/question-categories", {
    method: "POST",
    body: payload,
  });
}

export function updateAdminQuestionCategory(categoryId: string, payload: Partial<AdminQuestionCategoryPayload>) {
  return apiRequest<AdminQuestionCategory>(`/admin/question-categories/${categoryId}`, {
    method: "PUT",
    body: payload,
  });
}

export function deleteAdminQuestionCategory(categoryId: string) {
  return apiRequest<null>(`/admin/question-categories/${categoryId}`, { method: "DELETE" });
}

export function getAdminQuestions({
  categoryId,
  offset,
  limit,
  search,
}: {
  categoryId?: string;
  offset?: number;
  limit?: number;
  search?: string;
} = {}) {
  return apiRequest<AdminPaginatedQuestions>("/admin/questions", {
    method: "GET",
    query: {
      category_id: categoryId,
      offset,
      limit,
      search,
    },
  });
}

export function createAdminQuestion(payload: AdminQuestionPayload) {
  return apiRequest<AdminQuestionListItem>("/admin/questions", {
    method: "POST",
    body: payload,
  });
}

export function updateAdminQuestion(questionId: string, payload: Partial<AdminQuestionPayload>) {
  return apiRequest<AdminQuestionListItem>(`/admin/questions/${questionId}`, {
    method: "PUT",
    body: payload,
  });
}

export function deleteAdminQuestion(questionId: string) {
  return apiRequest<null>(`/admin/questions/${questionId}`, { method: "DELETE" });
}

export function uploadAdminQuestionImage(file: File) {
  const body = new FormData();
  body.append("file", file);
  return apiRequest<{ url: string; filename: string }>("/admin/media/image", {
    method: "POST",
    body,
  });
}

export function createAdminAnswerOption(questionId: string, payload: AdminAnswerOptionPayload) {
  return apiRequest<AdminAnswerOption>(`/admin/questions/${questionId}/options`, {
    method: "POST",
    body: payload,
  });
}

export function updateAdminAnswerOption(optionId: string, payload: Partial<AdminAnswerOptionPayload>) {
  return apiRequest<AdminAnswerOption>(`/admin/options/${optionId}`, {
    method: "PUT",
    body: payload,
  });
}

export function deleteAdminAnswerOption(optionId: string) {
  return apiRequest<null>(`/admin/options/${optionId}`, { method: "DELETE" });
}

export function getAdminPlans() {
  return apiRequest<AdminSubscriptionPlan[]>("/admin/plans", { method: "GET" });
}

export function createAdminPlan(payload: AdminSubscriptionPlanPayload) {
  return apiRequest<AdminSubscriptionPlan>("/admin/plans", {
    method: "POST",
    body: payload,
  });
}

export function updateAdminPlan(planId: string, payload: Partial<AdminSubscriptionPlanPayload>) {
  return apiRequest<AdminSubscriptionPlan>(`/admin/plans/${planId}`, {
    method: "PUT",
    body: payload,
  });
}

export function deleteAdminPlan(planId: string) {
  return apiRequest<null>(`/admin/plans/${planId}`, { method: "DELETE" });
}

export function getAdminPromos() {
  return apiRequest<AdminPromoCode[]>("/admin/promos", { method: "GET" });
}

export function createAdminPromo(payload: AdminPromoCodePayload) {
  return apiRequest<AdminPromoCode>("/admin/promos", {
    method: "POST",
    body: payload,
  });
}

export function updateAdminPromo(promoId: string, payload: Partial<AdminPromoCodePayload>) {
  return apiRequest<AdminPromoCode>(`/admin/promos/${promoId}`, {
    method: "PUT",
    body: payload,
  });
}

export function deleteAdminPromo(promoId: string) {
  return apiRequest<null>(`/admin/promos/${promoId}`, { method: "DELETE" });
}

export function getAdminViolations() {
  return apiRequest<AdminViolationLog[]>("/admin/violations", { method: "GET" });
}

export function getAdminSimulationExamSettings() {
  return apiRequest<AdminSimulationExamSettings>("/admin/simulation-exam-settings", { method: "GET" });
}

export function updateAdminSimulationExamSettings(payload: AdminSimulationExamSettingsPayload) {
  return apiRequest<AdminSimulationExamSettings>("/admin/simulation-exam-settings", {
    method: "PUT",
    body: payload,
  });
}

export function getAdminSchools() {
  return apiRequest<SchoolAdminProfile[]>("/admin/driving-schools", { method: "GET" });
}

export function createAdminSchool(payload: AdminDrivingSchoolPayload) {
  return apiRequest<SchoolAdminProfile>("/admin/driving-schools", {
    method: "POST",
    body: payload,
  });
}

export function updateAdminSchool(schoolId: string, payload: Partial<AdminDrivingSchoolPayload>) {
  return apiRequest<SchoolAdminProfile>(`/admin/driving-schools/${schoolId}`, {
    method: "PUT",
    body: payload,
  });
}

export function deleteAdminSchool(schoolId: string) {
  return apiRequest<null>(`/admin/driving-schools/${schoolId}`, { method: "DELETE" });
}

export function uploadAdminSchoolMedia(file: File) {
  const body = new FormData();
  body.append("file", file);
  return apiRequest<AdminUploadedAsset>("/admin/driving-schools/media/upload", {
    method: "POST",
    body,
  });
}

export function createAdminSchoolCourse(schoolId: string, payload: AdminDrivingSchoolCoursePayload) {
  return apiRequest<SchoolAdminProfile["courses"][number]>(`/admin/driving-schools/${schoolId}/courses`, {
    method: "POST",
    body: payload,
  });
}

export function updateAdminSchoolCourse(courseId: string, payload: Partial<AdminDrivingSchoolCoursePayload>) {
  return apiRequest<SchoolAdminProfile["courses"][number]>(`/admin/driving-schools/courses/${courseId}`, {
    method: "PUT",
    body: payload,
  });
}

export function deleteAdminSchoolCourse(courseId: string) {
  return apiRequest<null>(`/admin/driving-schools/courses/${courseId}`, { method: "DELETE" });
}

export function createAdminSchoolMedia(schoolId: string, payload: AdminDrivingSchoolMediaPayload) {
  return apiRequest<SchoolMedia>(`/admin/driving-schools/${schoolId}/media`, {
    method: "POST",
    body: payload,
  });
}

export function updateAdminSchoolMedia(mediaId: string, payload: Partial<AdminDrivingSchoolMediaPayload>) {
  return apiRequest<SchoolMedia>(`/admin/driving-schools/media/${mediaId}`, {
    method: "PUT",
    body: payload,
  });
}

export function deleteAdminSchoolMedia(mediaId: string) {
  return apiRequest<null>(`/admin/driving-schools/media/${mediaId}`, { method: "DELETE" });
}

export function getAdminSchoolLeads() {
  return apiRequest<SchoolLead[]>("/admin/driving-schools/leads", { method: "GET" });
}

export function updateAdminSchoolLead(leadId: string, payload: AdminDrivingSchoolLeadPayload) {
  return apiRequest<SchoolLead>(`/admin/driving-schools/leads/${leadId}`, {
    method: "PUT",
    body: payload,
  });
}

export function getAdminSchoolApplications() {
  return apiRequest<SchoolPartnerApplication[]>("/admin/driving-schools/partner-applications", {
    method: "GET",
  });
}

export function updateAdminSchoolApplication(
  applicationId: string,
  payload: AdminDrivingSchoolPartnerApplicationPayload,
) {
  return apiRequest<SchoolPartnerApplication>(`/admin/driving-schools/partner-applications/${applicationId}`, {
    method: "PUT",
    body: payload,
  });
}

export function getAdminSchoolReviews() {
  return apiRequest<SchoolReview[]>("/admin/driving-schools/reviews", { method: "GET" });
}

export function updateAdminSchoolReview(reviewId: string, payload: AdminDrivingSchoolReviewPayload) {
  return apiRequest<SchoolReview>(`/admin/driving-schools/reviews/${reviewId}`, {
    method: "PUT",
    body: payload,
  });
}

export function deleteAdminSchoolReview(reviewId: string) {
  return apiRequest<null>(`/admin/driving-schools/reviews/${reviewId}`, { method: "DELETE" });
}

export function getAdminSchoolPromoStats() {
  return apiRequest<{ items: AdminDrivingSchoolPromoStatsItem[] }>("/admin/driving-schools/promo-stats", {
    method: "GET",
  });
}

export function getAdminInstructors() {
  return apiRequest<InstructorAdminProfile[]>("/admin/driving-instructors", { method: "GET" });
}

export function createAdminInstructor(payload: AdminDrivingInstructorPayload) {
  return apiRequest<InstructorAdminProfile>("/admin/driving-instructors", {
    method: "POST",
    body: payload,
  });
}

export function updateAdminInstructor(instructorId: string, payload: Partial<AdminDrivingInstructorPayload>) {
  return apiRequest<InstructorAdminProfile>(`/admin/driving-instructors/${instructorId}`, {
    method: "PUT",
    body: payload,
  });
}

export function deleteAdminInstructor(instructorId: string) {
  return apiRequest<null>(`/admin/driving-instructors/${instructorId}`, { method: "DELETE" });
}

export function uploadAdminInstructorMedia(file: File) {
  const body = new FormData();
  body.append("file", file);
  return apiRequest<AdminUploadedAsset>("/admin/driving-instructors/media/upload", {
    method: "POST",
    body,
  });
}

export function createAdminInstructorMedia(instructorId: string, payload: AdminDrivingInstructorMediaPayload) {
  return apiRequest<InstructorAdminProfile["media_items"][number]>(`/admin/driving-instructors/${instructorId}/media`, {
    method: "POST",
    body: payload,
  });
}

export function updateAdminInstructorMedia(mediaId: string, payload: Partial<AdminDrivingInstructorMediaPayload>) {
  return apiRequest<InstructorAdminProfile["media_items"][number]>(`/admin/driving-instructors/media/${mediaId}`, {
    method: "PUT",
    body: payload,
  });
}

export function deleteAdminInstructorMedia(mediaId: string) {
  return apiRequest<null>(`/admin/driving-instructors/media/${mediaId}`, { method: "DELETE" });
}

export function getAdminInstructorApplications() {
  return apiRequest<InstructorApplication[]>("/admin/driving-instructors/applications", {
    method: "GET",
  });
}

export function updateAdminInstructorApplication(
  applicationId: string,
  payload: AdminDrivingInstructorApplicationPayload,
) {
  return apiRequest<InstructorApplication>(`/admin/driving-instructors/applications/${applicationId}`, {
    method: "PUT",
    body: payload,
  });
}

export function getAdminInstructorLeads() {
  return apiRequest<InstructorLead[]>("/admin/driving-instructors/leads", { method: "GET" });
}

export function updateAdminInstructorLead(leadId: string, payload: AdminDrivingInstructorLeadPayload) {
  return apiRequest<InstructorLead>(`/admin/driving-instructors/leads/${leadId}`, {
    method: "PUT",
    body: payload,
  });
}

export function getAdminInstructorReviews() {
  return apiRequest<InstructorReview[]>("/admin/driving-instructors/reviews", { method: "GET" });
}

export function updateAdminInstructorReview(reviewId: string, payload: AdminDrivingInstructorReviewPayload) {
  return apiRequest<InstructorReview>(`/admin/driving-instructors/reviews/${reviewId}`, {
    method: "PUT",
    body: payload,
  });
}

export function deleteAdminInstructorReview(reviewId: string) {
  return apiRequest<null>(`/admin/driving-instructors/reviews/${reviewId}`, { method: "DELETE" });
}

export function getAdminInstructorComplaints() {
  return apiRequest<AdminDrivingInstructorsData["complaints"]>("/admin/driving-instructors/complaints", {
    method: "GET",
  });
}

export function updateAdminInstructorComplaint(
  complaintId: string,
  payload: AdminDrivingInstructorComplaintPayload,
) {
  return apiRequest<AdminDrivingInstructorsData["complaints"][number]>(
    `/admin/driving-instructors/complaints/${complaintId}`,
    {
      method: "PUT",
      body: payload,
    },
  );
}

export function getAdminInstructorRegistrationSettings() {
  return apiRequest<InstructorRegistrationSettings>("/admin/driving-instructors/registration-settings", {
    method: "GET",
  });
}

export function updateAdminInstructorRegistrationSettings(
  payload: AdminDrivingInstructorRegistrationSettingsPayload,
) {
  return apiRequest<InstructorRegistrationSettings>("/admin/driving-instructors/registration-settings", {
    method: "PUT",
    body: payload,
  });
}

export function getAdminInstructorPromoStats() {
  return apiRequest<{ items: AdminDrivingInstructorPromoStatsItem[] }>(
    "/admin/driving-instructors/promo-stats",
    {
      method: "GET",
    },
  );
}

function resolveSection<T>(
  result: PromiseSettledResult<T>,
  section: string,
  unavailableSections: string[],
  fallback: T,
) {
  if (result.status === "fulfilled") {
    return result.value;
  }

  unavailableSections.push(section);
  return fallback;
}

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  const [analyticsResult, growthSummaryResult, paymentSummaryResult] = await Promise.allSettled([
    getAdminAnalyticsSummary(),
    getAdminGrowthSummary(),
    getAdminFinanceSummary(),
  ]);

  const unavailableSections: string[] = [];

  return {
    analytics: resolveSection(analyticsResult, "analytics", unavailableSections, null),
    growthSummary: resolveSection(growthSummaryResult, "growth", unavailableSections, null),
    paymentSummary: resolveSection(paymentSummaryResult, "payments", unavailableSections, null),
    unavailableSections,
  };
}

export async function getAdminContentData(): Promise<AdminContentData> {
  const [tests, lessons, questionsPage, categories, simulationExamSettings] = await Promise.all([
    getAdminTests(),
    getAdminLessons(),
    getAdminQuestions({ limit: 200 }),
    getAdminQuestionCategories(),
    getAdminSimulationExamSettings(),
  ]);

  return {
    tests,
    lessons,
    questions: questionsPage.items,
    questionTotal: questionsPage.total,
    categories,
    simulationExamSettings,
  };
}

export async function getAdminBillingData(): Promise<AdminBillingData> {
  const [plans, promos] = await Promise.all([getAdminPlans(), getAdminPromos()]);
  return { plans, promos };
}

export async function getAdminDrivingSchoolsData(): Promise<AdminDrivingSchoolsData> {
  const [schools, leads, applications, reviews, promoStats] = await Promise.all([
    getAdminSchools(),
    getAdminSchoolLeads(),
    getAdminSchoolApplications(),
    getAdminSchoolReviews(),
    getAdminSchoolPromoStats(),
  ]);

  return {
    schools: schools.map(normalizeSchoolAdminProfile),
    leads,
    applications,
    reviews,
    promoStats: promoStats.items,
  };
}

export async function getAdminDrivingInstructorsData(): Promise<AdminDrivingInstructorsData> {
  const [instructors, applications, leads, reviews, complaints, registrationSettings, promoStats] =
    await Promise.all([
      getAdminInstructors(),
      getAdminInstructorApplications(),
      getAdminInstructorLeads(),
      getAdminInstructorReviews(),
      getAdminInstructorComplaints(),
      getAdminInstructorRegistrationSettings(),
      getAdminInstructorPromoStats(),
    ]);

  return {
    instructors: instructors.map(normalizeInstructorAdminProfile),
    applications,
    leads,
    reviews,
    complaints,
    registrationSettings,
    promoStats: promoStats.items,
  };
}
