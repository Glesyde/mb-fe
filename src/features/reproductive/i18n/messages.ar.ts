// Arabic message catalogue. Same keys as messages.en.ts (enforced by the type).
// Render with dir="rtl" lang="ar". Every string is pending native clinician review.

import type { MessageKey } from "./messages.en";

export const AR_TEXT_ATTRS = { dir: "rtl", lang: "ar" } as const;

export const messagesAr: Record<MessageKey, string> = {
  // --- Labels --------------------------------------------------------------------------------
  "safety.layerName": "طبقة ضوابط السلامة", // ARABIC: pending native clinician review
  "vector.V1.title": "المخزون في سياق العمر", // ARABIC: pending native clinician review
  "vector.V2.title": "الدورة والإباضة", // ARABIC: pending native clinician review
  "vector.V3.title": "الأيض ونمط الحياة", // ARABIC: pending native clinician review
  "vector.V4.title": "العامل الذكري", // ARABIC: pending native clinician review
  "vector.V5.title": "عوامل التاريخ الطبي", // ARABIC: pending native clinician review
  "state.IMPROVING": "يتحسن", // ARABIC: pending native clinician review
  "state.STABLE": "مستقر", // ARABIC: pending native clinician review
  "state.V1.STABLE": "متوافق مع العمر", // ARABIC: pending native clinician review
  "state.NEEDS_ATTENTION": "يحتاج إلى متابعة", // ARABIC: pending native clinician review
  "state.NOT_ENOUGH_DATA": "لا توجد بيانات كافية", // ARABIC: pending native clinician review
  "state.DATA_WITHDRAWN": "تم سحب البيانات", // ARABIC: pending native clinician review
  "density.NONE": "لا توجد قراءات", // ARABIC: pending native clinician review
  "density.BASELINE_ONLY": "قراءة أساسية فقط", // ARABIC: pending native clinician review
  "density.TREND": "اتجاه", // ARABIC: pending native clinician review
  "density.ESTABLISHED": "اتجاه ثابت", // ARABIC: pending native clinician review
  "pathway.P1": "تحسين الصحة", // ARABIC: pending native clinician review
  "pathway.P2": "فحوصات موجّهة", // ARABIC: pending native clinician review
  "pathway.P3": "استشارة ما قبل الحمل", // ARABIC: pending native clinician review
  "pathway.P4": "مناقشة الحفاظ على الخصوبة", // ARABIC: pending native clinician review
  "pathway.P5": "إحالة إلى أخصائي", // ARABIC: pending native clinician review
  "pathway.P6": "رعاية عاجلة", // ARABIC: pending native clinician review
  "urgency.INFO": "للعلم", // ARABIC: pending native clinician review
  "urgency.ROUTINE": "روتيني", // ARABIC: pending native clinician review
  "urgency.URGENT": "عاجل", // ARABIC: pending native clinician review
  "urgency.EMERGENCY": "طارئ", // ARABIC: pending native clinician review
  "consent.category.PROFILE": "العمر والجنس", // ARABIC: pending native clinician review
  "consent.category.HISTORY": "التاريخ الطبي", // ARABIC: pending native clinician review
  "consent.category.LIFESTYLE": "نمط الحياة", // ARABIC: pending native clinician review
  "consent.category.PLANS": "خطط الحمل والأسئلة", // ARABIC: pending native clinician review
  "consent.category.CYCLES": "سجلات الدورة", // ARABIC: pending native clinician review
  "consent.category.METABOLIC": "فحوصات الأيض", // ARABIC: pending native clinician review
  "consent.category.HORMONES_SEMEN": "الهرمونات والسائل المنوي", // ARABIC: pending native clinician review
  "consent.category.WEARABLES": "الأجهزة القابلة للارتداء", // ARABIC: pending native clinician review
  "consent.category.PARTNER_SHARING": "المشاركة مع الشريك", // ARABIC: pending native clinician review
  "consent.category.CLINICIAN_SHARING": "المشاركة مع الطبيب", // ARABIC: pending native clinician review
  "input.AGE": "العمر", // ARABIC: pending native clinician review
  "input.AMH": "AMH", // ARABIC: pending native clinician review
  "input.AFC": "AFC", // ARABIC: pending native clinician review
  "input.CYCLES": "سجلات الدورة", // ARABIC: pending native clinician review
  "input.PERIODS_ABSENT": "انقطاع الدورة", // ARABIC: pending native clinician review
  "input.BMI": "مؤشر كتلة الجسم", // ARABIC: pending native clinician review
  "input.HBA1C": "HbA1c", // ARABIC: pending native clinician review
  "input.FASTING_GLUCOSE": "سكر الدم الصائم", // ARABIC: pending native clinician review
  "input.BP": "ضغط الدم", // ARABIC: pending native clinician review
  "input.SMOKING": "التدخين", // ARABIC: pending native clinician review
  "input.ALCOHOL": "الكحول", // ARABIC: pending native clinician review
  "input.SEMEN_ANALYSIS": "تحليل السائل المنوي", // ARABIC: pending native clinician review
  "input.HEAT_EXPOSURE": "التعرض للحرارة", // ARABIC: pending native clinician review
  "input.OCCUPATION": "المهنة", // ARABIC: pending native clinician review
  "input.HISTORY": "التاريخ الطبي", // ARABIC: pending native clinician review

  // --- Common --------------------------------------------------------------------------------
  "common.doctorDecides": "طبيبك هو من يقرر.", // ARABIC: pending native clinician review
  "common.decisionSupport": "للدعم في اتخاذ القرار والتثقيف فقط. هذا ليس تشخيصًا.", // ARABIC: pending native clinician review
  "common.noSingleNumber": "تعرض هذه الصفحة اتجاهات منفصلة. ولا تختصر الخصوبة في رقم واحد.", // ARABIC: pending native clinician review
  "common.trendNeedsTwo": "نتيجة واحدة لا تُظهر التغير مع الوقت. يلزم وجود نتيجتين على الأقل، بفارق 6 أشهر على الأقل، لإظهار اتجاه.", // ARABIC: pending native clinician review
  "common.dataWithdrawn": "تم سحب الموافقة على هذه البيانات. ولا تُستخدم في أي حساب.", // ARABIC: pending native clinician review
  "common.referencePending": "النطاقات المرجعية بانتظار الاعتماد السريري", // ARABIC: pending native clinician review
  "common.emergency": "تحتاج هذه الأعراض إلى رعاية طبية عاجلة. اتصل بالرقم 998 للإسعاف أو توجّه الآن إلى أقرب قسم طوارئ.", // ARABIC: pending native clinician review
  "explain.templateLabel": "صياغة نموذجية قياسية", // ARABIC: pending native clinician review
  "nextSteps.partnerGroup": "لشريكك", // ARABIC: pending native clinician review
  "nextSteps.partnerNote": "من البيانات التي اختار شريكك مشاركتها معك.", // ARABIC: pending native clinician review
  "brief.title": "ملخص النقاش حول الصحة الإنجابية", // ARABIC: pending native clinician review
  "brief.synthetic": "عرض توضيحي – بيانات اصطناعية. ليس مريضًا حقيقيًا.", // ARABIC: pending native clinician review
  "brief.date": "التاريخ: {date}", // ARABIC: pending native clinician review
  "brief.person": "{sex}، {age}", // ARABIC: pending native clinician review
  "brief.summary": "الملخص", // ARABIC: pending native clinician review
  "brief.trends": "الاتجاهات", // ARABIC: pending native clinician review
  "brief.discussion": "نقاط للنقاش", // ARABIC: pending native clinician review
  "brief.missing": "فحوصات ومعلومات ناقصة", // ARABIC: pending native clinician review
  "brief.citations": "المصادر", // ARABIC: pending native clinician review
  "brief.latest": "الأحدث: {value} {unit} ({date}).", // ARABIC: pending native clinician review
  "brief.noneMissing": "لا يوجد نقص في البطاقات المعروضة.", // ARABIC: pending native clinician review
  "brief.noDiscussion": "لا تقترح القواعد اليوم أي إحالة أو فحص أو نقاش.", // ARABIC: pending native clinician review
  "brief.footer": "ملخص صحي سري للمريض وطبيبه. لا يُستخدم في قرارات التوظيف أو التأمين.", // ARABIC: pending native clinician review
  "sex.female": "أنثى", // ARABIC: pending native clinician review
  "sex.male": "ذكر", // ARABIC: pending native clinician review
  "sex.unknown": "الجنس غير مسجل", // ARABIC: pending native clinician review
  "age.years": "{age} عامًا", // ARABIC: pending native clinician review
  "age.unknown": "العمر غير مسجل", // ARABIC: pending native clinician review
  "referral.title": "ملخص الإحالة", // ARABIC: pending native clinician review
  "referral.notBooking": "هذا الملخص لا يحجز موعدًا ولا يصف أدوية.", // ARABIC: pending native clinician review
  "referral.pathway": "المسار: {pathway}", // ARABIC: pending native clinician review
  "referral.created": "تاريخ الإنشاء: {time}", // ARABIC: pending native clinician review
  "referral.reasons": "الأسباب", // ARABIC: pending native clinician review
  "referral.context": "حالة المسارات الحالية", // ARABIC: pending native clinician review
  "explain.standardWording": "تُعرض الصياغة القياسية", // ARABIC: pending native clinician review

  // --- V1 Reserve ----------------------------------------------------------------------------
  "v1.inLine": "مستوى AMH متوافق مع المستويات المتوقعة لهذا العمر. يعكس AMH عدد البويضات المتبقية. وهو لا يقيس جودة البويضات ولا يتنبأ بالحمل الطبيعي (NICE NG257 1.18.3).", // ARABIC: pending native clinician review
  "v1.belowBand": "مستوى AMH أقل من النطاق المرجعي لهذا العمر. يعكس AMH عدد البويضات المتبقية. وهو لا يقيس جودة البويضات ولا يتنبأ بالحمل الطبيعي (NICE NG257 1.18.3).", // ARABIC: pending native clinician review
  "v1.aboveBand": "مستوى AMH أعلى من النطاق المرجعي لهذا العمر. يعكس AMH عدد البويضات المتبقية. وهو لا يتنبأ بالحمل الطبيعي (NICE NG257 1.18.3).", // ARABIC: pending native clinician review
  "v1.noRecentData": "لا توجد نتيجة AMH أو AFC خلال آخر 24 شهرًا.", // ARABIC: pending native clinician review
  "v1.afcOnly": "تتوفر نتيجة AFC فقط. لا تحتوي هذه الأداة على نطاق مرجعي لـ AFC، لذا تُعرض دون مقارنة.", // ARABIC: pending native clinician review
  "v1.noBandForAge": "لا يوجد نطاق مرجعي لـ AMH محدد لهذا العمر.", // ARABIC: pending native clinician review
  "v1.noAge": "العمر غير مسجل، لذا لا يمكن مقارنة AMH بنطاق عمري.", // ARABIC: pending native clinician review
  "v1.confounder.hormonalContraception": "تم قياس AMH هذا أثناء استخدام وسيلة منع حمل هرمونية، وقد يؤدي ذلك إلى خفض AMH. قد يأخذ الطبيب ذلك في الاعتبار.", // ARABIC: pending native clinician review

  // --- V2 Cycles -----------------------------------------------------------------------------
  "v2.regular": "الدورات منتظمة، بين 24 و35 يومًا.", // ARABIC: pending native clinician review
  "v2.short": "الدورات عادةً أقصر من 24 يومًا.", // ARABIC: pending native clinician review
  "v2.long": "الدورات عادةً أطول من 35 يومًا.", // ARABIC: pending native clinician review
  "v2.variable": "يتغير طول الدورة كثيرًا من دورة إلى أخرى.", // ARABIC: pending native clinician review
  "v2.absent": "الدورة الشهرية مسجلة على أنها منقطعة.", // ARABIC: pending native clinician review
  "v2.fewCycles": "عدد الدورات المسجلة أقل من 3. يلزم وجود 3 دورات على الأقل لوصف النمط.", // ARABIC: pending native clinician review

  // --- V3 Metabolic and lifestyle ------------------------------------------------------------
  "v3.bmiHigh": "مؤشر كتلة الجسم 30 أو أكثر. الوزن من الأمور التي يمكن تغييرها.", // ARABIC: pending native clinician review
  "v3.bmiLow": "مؤشر كتلة الجسم أقل من 18.5. الوزن من الأمور التي يمكن تغييرها.", // ARABIC: pending native clinician review
  "v3.hba1cImproving": "انخفض HbA1c عبر نتائج يفصل بينها 6 أشهر على الأقل.", // ARABIC: pending native clinician review
  "v3.hba1cRising": "ارتفع HbA1c إلى نطاق ما قبل السكري.", // ARABIC: pending native clinician review
  "v3.hba1cPrediabetes": "آخر نتيجة HbA1c ضمن نطاق ما قبل السكري. نتيجة واحدة لا تُظهر اتجاهًا.", // ARABIC: pending native clinician review
  "v3.hba1cAbove": "آخر نتيجة HbA1c أعلى من نطاق ما قبل السكري. يُقترح أن يراجعها الطبيب.", // ARABIC: pending native clinician review
  "v3.smoking": "التدخين مسجل. الإقلاع عن التدخين من الأمور التي يمكن تغييرها.", // ARABIC: pending native clinician review
  "v3.fewReadings": "عدد قراءات الأيض أقل من 2 خلال آخر 12 شهرًا.", // ARABIC: pending native clinician review
  "v3.stable": "لا تُظهر قراءات الأيض المسجلة تغيرًا يحتاج إلى متابعة.", // ARABIC: pending native clinician review

  // --- V4 Male factor ------------------------------------------------------------------------
  "v4.withinReference": "آخر تحليل للسائل المنوي ضمن القيم المرجعية لمنظمة الصحة العالمية.", // ARABIC: pending native clinician review
  "v4.belowReference": "في آخر تحليل للسائل المنوي قيمة واحدة أو أكثر أقل من القيم المرجعية لمنظمة الصحة العالمية.", // ARABIC: pending native clinician review
  "v4.noSperm": "لم تُشاهد حيوانات منوية في آخر تحليل.", // ARABIC: pending native clinician review
  "v4.heat": "التعرض المنتظم للحرارة مسجل. وهذا من الأمور التي يمكن تغييرها.", // ARABIC: pending native clinician review
  "v4.smoking": "التدخين مسجل. الإقلاع عن التدخين من الأمور التي يمكن تغييرها.", // ARABIC: pending native clinician review
  "v4.noSemen": "لا يوجد تحليل للسائل المنوي مسجل حتى الآن.", // ARABIC: pending native clinician review
  "v4.fromPartner": "معروض فقط من البيانات التي شاركها الشريك المرتبط.", // ARABIC: pending native clinician review
  "v4.partnerNotShared": "لم يشارك الشريك المرتبط البيانات التي تحتاجها هذه البطاقة.", // ARABIC: pending native clinician review

  // --- V5 History ----------------------------------------------------------------------------
  "v5.riskPresent": "يتضمن التاريخ الطبي عوامل قد تؤثر في الصحة الإنجابية.", // ARABIC: pending native clinician review
  "v5.none": "لا توجد عوامل خطر مسجلة في التاريخ الطبي.", // ARABIC: pending native clinician review
  "v5.notFilled": "لم تتم تعبئة التاريخ الطبي.", // ARABIC: pending native clinician review
  "history.newCancerDiagnosis": "تشخيص جديد بالسرطان", // ARABIC: pending native clinician review
  "history.pastChemoOrRadiotherapy": "علاج كيميائي أو إشعاعي سابق", // ARABIC: pending native clinician review
  "history.pastOvarianSurgery": "جراحة سابقة في المبيض", // ARABIC: pending native clinician review
  "history.plannedOvarianSurgery": "جراحة مخطط لها في المبيض", // ARABIC: pending native clinician review
  "history.pastPelvicSurgery": "جراحة سابقة في الحوض", // ARABIC: pending native clinician review
  "history.pastPelvicInfection": "التهاب سابق في الحوض", // ARABIC: pending native clinician review
  "history.pastEctopicPregnancy": "حمل سابق خارج الرحم", // ARABIC: pending native clinician review
  "history.endometriosis": "بطانة الرحم المهاجرة", // ARABIC: pending native clinician review
  "history.familyEarlyMenopause": "تاريخ عائلي لانقطاع الطمث المبكر", // ARABIC: pending native clinician review
  "history.geneticPoiRisk": "خطر وراثي لقصور المبيض المبكر", // ARABIC: pending native clinician review
  "history.undescendedTestes": "خصية معلقة", // ARABIC: pending native clinician review
  "history.genitalSurgeryOrTrauma": "جراحة أو إصابة في الأعضاء التناسلية", // ARABIC: pending native clinician review

  // --- Gaps ----------------------------------------------------------------------------------
  "gap.noHormones": "لم تتم مشاركة فحوصات هرمونية.", // ARABIC: pending native clinician review
  "gap.noCycles": "لم تتم مشاركة سجلات الدورة.", // ARABIC: pending native clinician review
  "gap.noMetabolic": "لم تتم مشاركة فحوصات الأيض.", // ARABIC: pending native clinician review
  "gap.noSemen": "لم تتم مشاركة تحليل للسائل المنوي.", // ARABIC: pending native clinician review
  "gap.noHistory": "لم تتم مشاركة التاريخ الطبي.", // ARABIC: pending native clinician review
  "gap.noAge": "العمر غير مسجل.", // ARABIC: pending native clinician review
  "gap.noSex": "الجنس غير مسجل، لذا لا تُعرض بعض البطاقات.", // ARABIC: pending native clinician review
  "gap.withdrawn.CYCLES": "تم سحب الموافقة على سجلات الدورة.", // ARABIC: pending native clinician review
  "gap.withdrawn.METABOLIC": "تم سحب الموافقة على فحوصات الأيض.", // ARABIC: pending native clinician review
  "gap.withdrawn.HORMONES_SEMEN": "تم سحب الموافقة على بيانات الهرمونات والسائل المنوي.", // ARABIC: pending native clinician review
  "gap.withdrawn.WEARABLES": "تم سحب الموافقة على بيانات الأجهزة القابلة للارتداء.", // ARABIC: pending native clinician review
  "gap.withdrawn.HISTORY": "تم سحب الموافقة على التاريخ الطبي.", // ARABIC: pending native clinician review
  "gap.withdrawn.LIFESTYLE": "تم سحب الموافقة على بيانات نمط الحياة.", // ARABIC: pending native clinician review
  "gap.withdrawn.PLANS": "تم سحب الموافقة على خطط الحمل والأسئلة.", // ARABIC: pending native clinician review
  "gap.partnerNotShared.HORMONES_SEMEN": "لم يشارك الشريك بيانات الهرمونات والسائل المنوي.", // ARABIC: pending native clinician review
  "gap.partnerNotShared.LIFESTYLE": "لم يشارك الشريك بيانات نمط الحياة.", // ARABIC: pending native clinician review

  // --- Rules ---------------------------------------------------------------------------------
  "rule.R01": "يعطي AMH سياقًا حول عدد البويضات المتبقية. ولا يُستخدم للتنبؤ بالحمل الطبيعي (NICE NG257 1.18.3). في دراسة على نساء أعمارهن من 30 إلى 44 عامًا دون مشكلات خصوبة معروفة، لم يتنبأ AMH بالحمل الطبيعي (Steiner, JAMA 2017).", // ARABIC: pending native clinician review
  "rule.R02": "قد يساعد AMH وAFC في توقع استجابة المبيضين للتحفيز في الإنجاب المساعد (NICE NG257 1.18.4). ويمكن عرض مناقشة مع أخصائي.", // ARABIC: pending native clinician review
  "rule.R03": "لا يُستخدم FSH القاعدي للتنبؤ باستجابة المبيض أو بنتيجة أطفال الأنابيب (NICE NG257 1.18.5).", // ARABIC: pending native clinician review
  "rule.R04": "تتراجع خصوبة المرأة مع التقدم في العمر. وتتراجع خصوبة الرجل أيضًا مع العمر، ولكن بدرجة أقل (NICE NG257 1.4.3).", // ARABIC: pending native clinician review
  "rule.R05": "للأزواج عمومًا، وليس توقعًا لأي شخص بعينه: أكثر من 80% من الأزواج، عندما يكون عمر المرأة أقل من 40 عامًا ويمارسان الجماع بانتظام دون وسائل منع الحمل، يحدث لديهم حمل خلال سنة واحدة. ويحدث الحمل لدى نحو نصف الباقين في السنة الثانية (NICE NG257 1.4.1).", // ARABIC: pending native clinician review
  "rule.R06": "عمر المرأة 36 عامًا أو أكثر وتحاول الحمل منذ 6 أشهر أو أكثر. يمكن مناقشة تقييم مبكر لدى أخصائي (NICE NG257 1.16.8).", // ARABIC: pending native clinician review
  "rule.R07": "محاولة الحمل منذ 12 شهرًا أو أكثر. يمكن مناقشة تقييم الشريكين كليهما (NICE NG257 section 1.16).", // ARABIC: pending native clinician review
  "rule.R08": "مسجل التهاب سابق في الحوض أو حمل خارج الرحم أو بطانة الرحم المهاجرة أو جراحة في الحوض. يمكن مناقشة تقييم مبكر لدى أخصائي (NICE NG257 section 1.16).", // ARABIC: pending native clinician review
  "rule.R09": "مسجل خصية معلقة أو جراحة أو إصابة في الأعضاء التناسلية أو علاج كيميائي أو إشعاعي سابق. يمكن مناقشة تقييم مبكر وتحليل للسائل المنوي (NICE NG257 section 1.16).", // ARABIC: pending native clinician review
  "rule.R10": "مسجل دورات أطول من 35 يومًا أو انقطاع الدورة. يمكن مناقشة فحوصات للتحقق من الإباضة وتقييم لدى أخصائي (NICE NG257 1.18.6, section 1.16).", // ARABIC: pending native clinician review
  "rule.R11": "الدورات الشهرية المنتظمة تعني عادةً حدوث الإباضة (NICE NG257 1.18.6).", // ARABIC: pending native clinician review
  "rule.R12": "الدورات غير منتظمة ومطلوب التحقق من الإباضة. يمكن مناقشة فحص هرمون البروجسترون في منتصف الطور الأصفري (NICE NG257 1.18.7).", // ARABIC: pending native clinician review
  "rule.R13": "مع مؤشر كتلة جسم 30 أو أكثر، من المرجح أن يستغرق الحمل وقتًا أطول. وإذا لم تكن الإباضة تحدث، فمن المرجح أن يساعد إنقاص الوزن (NICE NG257 1.9.1).", // ARABIC: pending native clinician review
  "rule.R14": "مع مؤشر كتلة جسم 30 أو أكثر والتخطيط للحمل، يمكن أن يساعد برنامج جماعي يجمع بين التمارين ونصائح التغذية (NICE NG257 1.9.2).", // ARABIC: pending native clinician review
  "rule.R15": "مؤشر كتلة الجسم أقل من 18.5 والدورة غير منتظمة أو منقطعة. يمكن أن تساعد نصائح زيادة الوزن (NICE NG257 1.10.1).", // ARABIC: pending native clinician review
  "rule.R16": "من المرجح أن يقلل التدخين من الخصوبة. يمكن تقديم الدعم للإقلاع عن التدخين (NICE NG257 1.7.1).", // ARABIC: pending native clinician review
  "rule.R17": "التدخين أو التعرض للتدخين السلبي مسجل. يمكن أن يساعد الدعم للإقلاع عن التدخين ومنزل خالٍ من الدخان (NICE NG257 section 1.7).", // ARABIC: pending native clinician review
  "rule.R18": "تناول الكحول مسجل. يمكن تقديم نصائح بشأن الكحول (NICE NG257 section 1.6).", // ARABIC: pending native clinician review
  "rule.R19": "لا يوجد دليل ثابت يربط الكافيين بمشكلات الخصوبة (NICE NG257 1.8.1).", // ARABIC: pending native clinician review
  "rule.R20": "يرتبط ارتفاع حرارة كيس الصفن بانخفاض جودة السائل المنوي. ومن غير المؤكد أن الملابس الداخلية الفضفاضة تساعد (NICE NG257 1.11.1).", // ARABIC: pending native clinician review
  "rule.R21": "بعض المهن قد تؤثر في الخصوبة. اسأل عن المهنة وقدّم نصائح الصحة المهنية (NICE NG257 1.12.1).", // ARABIC: pending native clinician review
  "rule.R22": "تُقارن نتائج تحليل السائل المنوي بالقيم المرجعية لمنظمة الصحة العالمية (NICE NG257 1.17.1).", // ARABIC: pending native clinician review
  "rule.R23": "تحليل واحد للسائل المنوي أقل من القيم المرجعية لمنظمة الصحة العالمية. يمكن مناقشة إعادة الفحص، ويُفضّل بعد 3 أشهر (NICE NG257 1.17.3 إلى 1.17.4).", // ARABIC: pending native clinician review
  "rule.R24": "تحليلان أو أكثر للسائل المنوي أقل من القيم المرجعية لمنظمة الصحة العالمية. يمكن مناقشة فحص سريري، والنظر في فحوصات دم لهرمون التستوستيرون والهرمونات المنشطة للغدد التناسلية (NICE NG257 1.17.5).", // ARABIC: pending native clinician review
  "rule.R25": "لم تُشاهد حيوانات منوية في التحليل المتكرر. يمكن مناقشة الإحالة إلى أخصائي أمراض الذكورة (NICE NG257 section 1.17).", // ARABIC: pending native clinician review
  "rule.R26": "لا يُوصى بفحص تجزؤ الحمض النووي للحيوانات المنوية (NICE NG257 1.17.6).", // ARABIC: pending native clinician review
  "rule.R27": "أعراض أمراض الغدة الدرقية مسجلة. يمكن عرض فحص للغدة الدرقية. ولا يُوصى بفحص الغدة الدرقية الروتيني دون أعراض (NICE NG257 1.18.12).", // ARABIC: pending native clinician review
  "rule.R28": "حالة المناعة ضد الحصبة الألمانية غير معروفة. يمكن عرض فحص لها، مع التطعيم عند عدم وجود مناعة. ويجب تجنب الحمل لمدة شهر واحد بعد التطعيم (NICE NG257 1.20.1, 1.20.2).", // ARABIC: pending native clinician review
  "rule.R29": "عند التخطيط للحمل، يمكن تقديم نصائح بشأن حمض الفوليك. وتتبع الجرعة إرشادات NICE لتغذية الأم والطفل (NICE NG257 1.15.1).", // ARABIC: pending native clinician review
  "rule.R30": "مسجل تشخيص جديد بالسرطان قبل العلاج الكيميائي أو العلاج الإشعاعي للحوض. يمكن عرض مناقشة عاجلة حول الحفاظ على الخصوبة قبل بدء العلاج (ESHRE female fertility preservation guideline).", // ARABIC: pending native clinician review
  "rule.R31": "جراحة المبيض مخطط لها. يمكن عرض مناقشة حول الحفاظ على الخصوبة قبل الجراحة (ESHRE female fertility preservation guideline).", // ARABIC: pending native clinician review
  "rule.R32": "مسجل تاريخ عائلي لانقطاع الطمث المبكر أو خطر وراثي لقصور المبيض المبكر. يمكن عرض مناقشة مبكرة للتخطيط (ESHRE female fertility preservation guideline).", // ARABIC: pending native clinician review
  "rule.R33": "يجري التفكير في تجميد البويضات لأسباب تتعلق بالعمر. يمكن تقديم التثقيف ومناقشة مع أخصائي (ESHRE female fertility preservation guideline).", // ARABIC: pending native clinician review
  "rule.R34": "مستوى AMH أقل من النطاق لهذا العمر، والدورات منتظمة، ولا توجد محاولة حالية للحمل. في دراسة على نساء أعمارهن من 30 إلى 44 عامًا دون مشكلات خصوبة معروفة، لم يتنبأ AMH بالحمل الطبيعي (Steiner, JAMA 2017; NICE NG257 1.18.3). يمكن عرض مناقشة للتخطيط.", // ARABIC: pending native clinician review
  "rule.R36": "النزيف بعد الجماع أو بين الدورات يحتاج إلى تقييم عاجل لدى طبيب أمراض النساء.", // ARABIC: pending native clinician review
  "rule.R37": "ينخفض HbA1c عبر نتائج يفصل بينها 6 أشهر على الأقل.", // ARABIC: pending native clinician review
  "rule.R38": "ارتفع HbA1c إلى نطاق ما قبل السكري. يُقترح دعم نمط الحياة ومراجعة الطبيب.", // ARABIC: pending native clinician review

  // --- Safety Guardrail Layer ----------------------------------------------------------------
  "guardrail.blocked.FERTILITY_SCORE": "لا تختصر هذه الأداة الخصوبة في رقم واحد. بل تعرض اتجاهات منفصلة لمناقشتها مع طبيبك.", // ARABIC: pending native clinician review
  "guardrail.blocked.DIAGNOSIS": "لا تستطيع هذه الأداة وضع تشخيص. بل تدعم الحوار مع طبيبك.", // ARABIC: pending native clinician review
  "guardrail.blocked.PRESCRIBING": "لا توصي هذه الأداة بأدوية ولا تصفها. طبيبك هو من يقرر بشأن أي علاج.", // ARABIC: pending native clinician review

  // --- Glossary (hover/tap definitions) ------------------------------------------------------
  "glossary.AMH": "الهرمون المضاد لمولر: تفرزه الجريبات الصغيرة في المبيضين. يعكس عدد البويضات المتبقية. وهو لا يقيس جودة البويضات ولا يتنبأ بالحمل الطبيعي.", // ARABIC: pending native clinician review
  "glossary.AFC": "عدد الجريبات الغارية: عدد الجريبات الصغيرة التي تظهر في الفحص بالموجات فوق الصوتية للمبيضين.", // ARABIC: pending native clinician review
  "glossary.FSH": "الهرمون المنبه للجريب: يساعد على نمو البويضات. ولا تُستخدم نتيجة FSH القاعدي للتنبؤ بالاستجابة لأطفال الأنابيب.", // ARABIC: pending native clinician review
  "glossary.SEMEN_ANALYSIS": "فحص مخبري لعينة من السائل المنوي: الحجم وعدد الحيوانات المنوية وحركتها وشكلها، مقارنةً بالقيم المرجعية لمنظمة الصحة العالمية.", // ARABIC: pending native clinician review
  "glossary.OVARIAN_RESERVE": "عدد البويضات المتبقية في المبيضين. وهو لا يقيس جودة البويضات.", // ARABIC: pending native clinician review
  "glossary.PCOS": "متلازمة تكيس المبايض: حالة هرمونية شائعة قد تسبب عدم انتظام الدورة. والطبيب وحده يمكنه تأكيدها.", // ARABIC: pending native clinician review
  "glossary.HBA1C": "فحص دم يُظهر متوسط سكر الدم خلال آخر شهرين إلى ثلاثة أشهر.", // ARABIC: pending native clinician review
  "glossary.BMI": "مؤشر كتلة الجسم: الوزن بالكيلوغرام مقسومًا على مربع الطول بالمتر.", // ARABIC: pending native clinician review
  "glossary.ENDOMETRIOSIS": "حالة ينمو فيها نسيج مشابه لبطانة الرحم خارج الرحم.", // ARABIC: pending native clinician review
  "glossary.OVULATION": "خروج بويضة من المبيض، وعادةً يحدث مرة واحدة في كل دورة شهرية.", // ARABIC: pending native clinician review
  "glossary.MID_LUTEAL_PROGESTERONE": "فحص دم قبل نحو 7 أيام من موعد الدورة التالية المتوقع، للتحقق من حدوث الإباضة.", // ARABIC: pending native clinician review
  "glossary.WHO_REFERENCE": "الحدود الدنيا لنتائج تحليل السائل المنوي من الدليل المخبري لمنظمة الصحة العالمية. النتيجة الأقل منها سبب لمزيد من التقييم، وليست تشخيصًا.", // ARABIC: pending native clinician review
  "glossary.FERTILITY_PRESERVATION": "تجميد البويضات أو الأجنة أو الحيوانات المنوية، أو حماية المبيضين، قبل علاج قد يؤثر في الخصوبة.", // ARABIC: pending native clinician review
  "glossary.POI": "قصور المبيض المبكر: توقف المبيضين عن العمل بشكل طبيعي قبل سن الأربعين.", // ARABIC: pending native clinician review
  "glossary.PREDIABETES": "سكر دم أعلى من الطبيعي لكنه أقل من نطاق السكري. وغالبًا ما تساعد تغييرات نمط الحياة على خفضه.", // ARABIC: pending native clinician review

  // --- Patient view (read-only, simpler wording, no rule IDs) ---------------------------------
  "patient.title": "صحتك الإنجابية", // ARABIC: pending native clinician review
  "patient.intro": "تعرض هذه الصفحة كيف تتغير نتائجك مع الوقت. ولا تعطي درجة أو تشخيصًا.", // ARABIC: pending native clinician review
  "patient.whatYouCanDo": "ما يمكنك فعله", // ARABIC: pending native clinician review
  "patient.doctorMaySuggest": "ما قد يقترحه طبيبك", // ARABIC: pending native clinician review
  "patient.yourResults": "نتائجك", // ARABIC: pending native clinician review
  "patient.nothingToChange": "لا يوجد شيء محدد لتغييره الآن. استمر في فحوصاتك المعتادة.", // ARABIC: pending native clinician review
  "patient.nothingToSuggest": "لا توجد فحوصات أو مواعيد إضافية مقترحة الآن.", // ARABIC: pending native clinician review
  "patient.oneResult": "توجد نتيجة واحدة فقط حتى الآن، لذا لا يمكن إظهار التغير مع الوقت بعد.", // ARABIC: pending native clinician review
  "patient.readOnly": "هذه الصفحة للقراءة فقط. تحدث إلى فريق الرعاية عن أي أسئلة.", // ARABIC: pending native clinician review
  "patient.tellTeam": "أخبر فريق الرعاية بهذه الأعراض فورًا.", // ARABIC: pending native clinician review
  "patient.why": "لماذا؟", // ARABIC: pending native clinician review
  "patient.sources": "المصادر", // ARABIC: pending native clinician review
  "patient.vector.V1": "مخزون البويضات بالنسبة لعمرك", // ARABIC: pending native clinician review
  "patient.vector.V2": "دورتك الشهرية", // ARABIC: pending native clinician review
  "patient.vector.V3": "الوزن وسكر الدم ونمط الحياة", // ARABIC: pending native clinician review
  "patient.vector.V4": "صحة الحيوانات المنوية", // ARABIC: pending native clinician review
  "patient.vector.V5": "التاريخ الصحي", // ARABIC: pending native clinician review
  "patient.rule.R06": "لأن عمرك 36 عامًا أو أكثر وتحاولين الحمل منذ 6 أشهر، قد يقترح طبيبك زيارة أخصائي في وقت أبكر.", // ARABIC: pending native clinician review
  "patient.rule.R07": "تحاولان الحمل منذ سنة أو أكثر. قد يقترح طبيبك فحوصات للشريكين كليهما.", // ARABIC: pending native clinician review
  "patient.rule.R08": "بسبب التهاب سابق في الحوض أو حمل خارج الرحم أو بطانة الرحم المهاجرة أو جراحة في الحوض، قد يقترح طبيبك زيارة أخصائي في وقت أبكر.", // ARABIC: pending native clinician review
  "patient.rule.R09": "بسبب تاريخك الصحي، قد يقترح طبيبك فحصًا مبكرًا وتحليلًا للسائل المنوي.", // ARABIC: pending native clinician review
  "patient.rule.R10": "دوراتك طويلة أو توقفت الدورة. قد يقترح طبيبك فحوصات للتحقق من الإباضة وزيارة أخصائي.", // ARABIC: pending native clinician review
  "patient.rule.R12": "قد يقترح طبيبك فحص دم قبل نحو أسبوع من موعد دورتك التالية للتحقق من الإباضة.", // ARABIC: pending native clinician review
  "patient.rule.R13": "قد يساعد إنقاص بعض الوزن. مع مؤشر كتلة جسم 30 أو أكثر، قد يستغرق الحمل وقتًا أطول.", // ARABIC: pending native clinician review
  "patient.rule.R14": "يمكن أن يساعد برنامج جماعي يجمع بين التمارين والأكل الصحي.", // ARABIC: pending native clinician review
  "patient.rule.R15": "يمكن أن تساعد زيادة بعض الوزن على انتظام دورتك.", // ARABIC: pending native clinician review
  "patient.rule.R16": "الإقلاع عن التدخين من أفضل ما يمكنك فعله. والدعم متاح.", // ARABIC: pending native clinician review
  "patient.rule.R17": "يمكن أن يساعد الإقلاع عن التدخين وإبقاء منزلك خاليًا من الدخان.", // ARABIC: pending native clinician review
  "patient.rule.R18": "يمكن أن يساعد التقليل من الكحول. اطلب النصيحة إن رغبت.", // ARABIC: pending native clinician review
  "patient.rule.R20": "قد يساعد إبقاء كيس الصفن باردًا، لذا تجنب الحرارة المنتظمة قدر الإمكان. ومن غير المؤكد أن الملابس الداخلية الفضفاضة تساعد.", // ARABIC: pending native clinician review
  "patient.rule.R21": "بعض المهن قد تؤثر في الخصوبة. اسأل عن نصائح تخص مكان عملك.", // ARABIC: pending native clinician review
  "patient.rule.R23": "كان تحليل واحد للسائل المنوي أقل من القيم المعتادة. ويُقترح عادةً إعادة التحليل، ويُفضّل بعد نحو 3 أشهر.", // ARABIC: pending native clinician review
  "patient.rule.R24": "كان تحليلان للسائل المنوي أقل من القيم المعتادة. قد يقترح طبيبك فحصًا سريريًا وفحوصات دم.", // ARABIC: pending native clinician review
  "patient.rule.R25": "لم تُشاهد حيوانات منوية في تحليلين. قد يقترح طبيبك زيارة أخصائي في الصحة الإنجابية للرجال.", // ARABIC: pending native clinician review
  "patient.rule.R27": "ذكرت أعراضًا قد تكون من الغدة الدرقية. قد يعرض طبيبك فحص دم للغدة الدرقية.", // ARABIC: pending native clinician review
  "patient.rule.R28": "مناعتك ضد الحصبة الألمانية غير معروفة. يمكن لفحص دم التحقق منها، مع التطعيم عند الحاجة. وتجنبي الحمل لمدة شهر واحد بعد التطعيم.", // ARABIC: pending native clinician review
  "patient.rule.R29": "إذا كنت تخططين للحمل، اسألي طبيبك عن حمض الفوليك.", // ARABIC: pending native clinician review
  "patient.rule.R30": "قبل بدء علاج السرطان، اسألي فريق الرعاية عن طرق حماية خصوبتك. يُرجى القيام بذلك قريبًا.", // ARABIC: pending native clinician review
  "patient.rule.R31": "قبل جراحة المبيض المخطط لها، اسألي عن طرق حماية خصوبتك في المستقبل.", // ARABIC: pending native clinician review
  "patient.rule.R32": "بسبب تاريخك العائلي، قد ترغبين في التخطيط مبكرًا. يمكن لطبيبك مناقشة ذلك معك.", // ARABIC: pending native clinician review
  "patient.rule.R33": "إذا كنت تفكرين في تجميد البويضات، يمكن لطبيبك شرح الخيارات وإحالتك إلى أخصائي.", // ARABIC: pending native clinician review
  "patient.rule.R36": "النزيف بعد الجماع أو بين الدورات يحتاج إلى فحص عاجل لدى طبيب أمراض النساء.", // ARABIC: pending native clinician review
  "patient.rule.R38": "ارتفع فحص سكر الدم (HbA1c). يمكن أن يساعد الأكل الصحي والنشاط، وسيراجعه طبيبك.", // ARABIC: pending native clinician review

  // --- Card labels ---
  "card.partnerData": "بيانات شاركها الشريك", // ARABIC: pending native clinician review
  "card.someWithdrawn": "تم سحب بعض البيانات", // ARABIC: pending native clinician review
  "card.bmiCalculated": "مؤشر كتلة الجسم محسوب", // ARABIC: pending native clinician review
  "card.noReadings": "لا توجد قراءات للعرض", // ARABIC: pending native clinician review
  "card.shaded": "المظلل: النطاق المرجعي", // ARABIC: pending native clinician review
  "card.dashed": "المتقطع: قراءة أساسية واحدة، دون اتجاه", // ARABIC: pending native clinician review
  "card.underSixMonths": "قراءات لأقل من 6 أشهر، دون اتجاه", // ARABIC: pending native clinician review
};
