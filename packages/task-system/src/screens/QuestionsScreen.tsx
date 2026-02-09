import { QuestionHeader } from "@components/QuestionHeader";
import { CompletionScreen } from "@components/questions/CompletionScreen";
import { ErrorState } from "@components/questions/ErrorState";
import { IntroductionScreen } from "@components/questions/IntroductionScreen";
import { LoadingState } from "@components/questions/LoadingState";
import { QuestionScreenContent } from "@components/questions/QuestionScreenContent";
import { ReviewScreenContainer } from "@components/questions/ReviewScreenContainer";
import { AppColors } from "@constants/AppColors";
import { AppFonts } from "@constants/AppFonts";
import { useQuestionsScreen } from "@hooks/useQuestionsScreen";
import { useTranslatedText } from "@hooks/useTranslatedText";
import { useTaskTranslation } from "@translations/index";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const CONTENT_PADDING = 20;

/**
 * Enum-like runtime constant for Questions screen modes.
 *
 * Centralizes string values so this screen doesn't compare raw literals.
 */
const QUESTIONS_SCREEN_MODE = {
  completion: "completion",
  introduction: "introduction",
  review: "review",
  questions: "questions",
} as const;

type QuestionsScreenMode =
  (typeof QUESTIONS_SCREEN_MODE)[keyof typeof QUESTIONS_SCREEN_MODE];

const QUESTIONS_SCREEN_TRANSLATION_KEYS = {
  title: "questions.title",
  noQuestionsAvailable: "questions.noQuestionsAvailable",
  goBack: "questions.goBack",
  answerQuestions: "activity.answerQuestions",
} as const;

interface QuestionsScreenProps {
  /**
   * When the module is embedded under a host header (e.g. Dashboard), the host
   * has already applied safe-area padding. Disable the extra top inset to avoid
   * large empty space above the header.
   */
  disableSafeAreaTopInset?: boolean;
}

export default function QuestionsScreen({
  disableSafeAreaTopInset = false,
}: QuestionsScreenProps) {
  const insets = useSafeAreaInsets();
  const topInset = disableSafeAreaTopInset ? 0 : insets.top;
  const { t } = useTaskTranslation();

  const {
    loading,
    error,
    activityData,
    activityConfig,
    answers,
    errors,
    isSubmitting,
    currentScreenIndex,
    showIntroduction,
    showReview,
    showCompletion,
    currentScreenValid,
    cameFromReview,
    taskId,
    task,
    handleAnswerChange,
    handleSubmit,
    handleNext,
    handlePrevious,
    handleBegin,
    handleEditQuestion,
    handleReviewSubmit,
    handleCompletionDone,
    handleBack,
  } = useQuestionsScreen();

  // Use task title if available, otherwise fall back to default
  const defaultTitle = taskId
    ? t(QUESTIONS_SCREEN_TRANSLATION_KEYS.answerQuestions)
    : t(QUESTIONS_SCREEN_TRANSLATION_KEYS.title);
  const taskTitle = task?.title || defaultTitle;
  const { translatedText: headerTitle } = useTranslatedText(taskTitle);

  if (loading) {
    return <LoadingState taskId={taskId} topInset={topInset} />;
  }

  if (error) {
    return (
      <ErrorState
        error={error}
        taskId={taskId}
        topInset={topInset}
        onBack={handleBack}
      />
    );
  }

  if (!activityData || activityData.screens.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.headerWrapper}>
          <QuestionHeader
            title={headerTitle}
            showBackButton={!!taskId}
            onBackPress={handleBack}
          />
        </View>
        <View
          style={[
            styles.contentWrapper,
            { paddingTop: topInset, paddingHorizontal: CONTENT_PADDING },
          ]}
        >
          <View style={styles.centerContainer}>
            <Text style={styles.emptyText}>
              {t(QUESTIONS_SCREEN_TRANSLATION_KEYS.noQuestionsAvailable)}
            </Text>
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <Text style={styles.backButtonText}>
                {t(QUESTIONS_SCREEN_TRANSLATION_KEYS.goBack)}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  const mode: QuestionsScreenMode = (() => {
    // Preserve existing precedence (and avoid rendering multiple modes simultaneously).
    if (showCompletion && !showIntroduction && !showReview && activityConfig) {
      return QUESTIONS_SCREEN_MODE.completion;
    }
    if (showIntroduction && !showCompletion) {
      return QUESTIONS_SCREEN_MODE.introduction;
    }
    if (showReview && !showIntroduction && !showCompletion) {
      return QUESTIONS_SCREEN_MODE.review;
    }
    return QUESTIONS_SCREEN_MODE.questions;
  })();

  const showBackButton =
    !!taskId &&
    mode !== QUESTIONS_SCREEN_MODE.completion &&
    mode !== QUESTIONS_SCREEN_MODE.review;
  const showCloseButton = !!taskId && mode !== QUESTIONS_SCREEN_MODE.completion;

  const renderByMode: { [key in QuestionsScreenMode]: () => React.ReactNode } =
    {
      [QUESTIONS_SCREEN_MODE.completion]: () =>
        activityConfig ? (
          <CompletionScreen
            activityConfig={activityConfig}
            onDone={handleCompletionDone}
          />
        ) : null,
      [QUESTIONS_SCREEN_MODE.introduction]: () => (
        <IntroductionScreen
          activityConfig={activityConfig || {}}
          onBegin={handleBegin}
          task={task}
        />
      ),
      [QUESTIONS_SCREEN_MODE.review]: () => (
        <ReviewScreenContainer
          activityData={activityData}
          answers={answers}
          isSubmitting={isSubmitting}
          onEditQuestion={handleEditQuestion}
          onSubmit={handleSubmit}
          bottomInset={insets.bottom}
          tabBarHeight={60}
        />
      ),
      [QUESTIONS_SCREEN_MODE.questions]: () => (
        <View style={styles.questionContainer}>
          <QuestionScreenContent
            activityData={activityData}
            currentScreenIndex={currentScreenIndex}
            answers={answers}
            errors={errors}
            onAnswerChange={handleAnswerChange}
            bottomInset={insets.bottom}
            currentScreenValid={currentScreenValid}
            cameFromReview={cameFromReview}
            isLastScreen={
              currentScreenIndex === activityData.screens.length - 1
            }
            onPrevious={handlePrevious}
            onNext={handleNext}
            onReviewOrSubmit={handleReviewSubmit}
            task={task ?? undefined}
          />
        </View>
      ),
    } as const;

  return (
    <View style={styles.container}>
      <View style={styles.headerWrapper}>
        <QuestionHeader
          title={headerTitle}
          showBackButton={showBackButton}
          onBackPress={handleBack}
          showCloseButton={showCloseButton}
          onClosePress={handleBack}
        />
      </View>
      <View
        style={[
          styles.contentWrapper,
          { paddingTop: topInset, paddingHorizontal: CONTENT_PADDING },
        ]}
      >
        {renderByMode[mode]()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.powderGray,
    margin: 0,
    paddingHorizontal: 0,
    marginHorizontal: 0,
  },
  contentWrapper: {
    flex: 1,
    paddingHorizontal: CONTENT_PADDING, // body padding
  },
  headerWrapper: {
    alignSelf: "stretch",
    width: "100%",
    marginHorizontal: 0,
    paddingHorizontal: 0,
  },
  questionContainer: { flex: 1, flexDirection: "column" },
  centerContainer: {
    flex: 1,
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    ...AppFonts.body,
    color: AppColors.legacy.gray,
    textAlign: "center",
    marginBottom: 16,
  },
  backButton: {
    backgroundColor: AppColors.legacy.lightGray,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  backButtonText: { ...AppFonts.label, color: AppColors.darkGray },
});
