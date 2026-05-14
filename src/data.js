export const questionnaireCategories = [
  {
    id: "cat_build",
    title: "Build",
    items: [
      { id: "b_manual", label: "Manual trigger", type: "yes_no_na" },
      { id: "b_triggers", label: "Other triggers (Push, PR, Sched, API)", type: "text" },
      { id: "b_dedicated", label: "Uses dedicated build server (outside GitHub runner)", type: "yes_no_na" },
      { id: "b_logging", label: "Explicit build logging", type: "yes_no_na" },
      { id: "b_cache", label: "Dependency caching", type: "yes_no_na" },
      { id: "b_artifacts", label: "Build artifacts are stored", type: "yes_no_na" },
      { id: "b_versioning", label: "Automatic artifact versioning", type: "yes_no_na" },
      { id: "b_notification", label: "Build success/failure notification", type: "yes_no_na" },
      { id: "b_report", label: "Build report creation", type: "yes_no_na" },
      { id: "b_concurrency", label: "Concurrency (multiple builds simultaneously)", type: "yes_no_na" },
      { id: "b_standardized", label: "Build process is standardized for all environments", type: "yes_no_na" },
      { id: "b_only_changed", label: "Build only changed components", type: "yes_no_na" },
      { id: "b_other", label: "Other features", type: "text" }
    ]
  },
  {
    id: "cat_unit_testing",
    title: "Unit Testing",
    items: [
      { id: "ut_manual", label: "Manual trigger", type: "yes_no_na" },
      { id: "ut_triggers", label: "Other triggers", type: "text" },
      { id: "ut_dedicated", label: "Uses dedicated test server", type: "yes_no_na" },
      { id: "ut_new_build", label: "Requires new build to run", type: "yes_no_na" },
      { id: "ut_logging", label: "Explicit test logging", type: "yes_no_na" },
      { id: "ut_report", label: "Test report creation", type: "yes_no_na" },
      { id: "ut_artifacts", label: "Test artifacts are stored", type: "yes_no_na" },
      { id: "ut_notification", label: "Test success/failure notification", type: "yes_no_na" },
      { id: "ut_terminate", label: "Pipeline terminates if tests fail", type: "yes_no_na" },
      { id: "ut_issue", label: "Automatic issue creation on test failure", type: "yes_no_na" }
    ]
  },
  {
    id: "cat_analysis",
    title: "Analysis (SonarQube, Linting...)",
    items: [
      { id: "an_manual", label: "Manual trigger", type: "yes_no_na" },
      { id: "an_depends", label: "Depends on (Build, Test...)", type: "text" },
      { id: "an_static", label: "Includes static code analysis", type: "yes_no_na" },
      { id: "an_gate_fail", label: "Pipeline terminates if quality gate fails", type: "yes_no_na" },
      { id: "an_security", label: "Includes security analysis", type: "yes_no_na" },
      { id: "an_vuln", label: "Includes dependency vulnerability check", type: "yes_no_na" },
      { id: "an_report", label: "Analysis report creation", type: "yes_no_na" },
      { id: "an_license", label: "Includes license check", type: "yes_no_na" },
      { id: "an_compliance", label: "Includes standards / regulations compliance check", type: "yes_no_na" },
      { id: "an_linting", label: "Includes linting", type: "yes_no_na" },
      { id: "an_pr_review", label: "Automated PR review", type: "yes_no_na" },
      { id: "an_gate_notif", label: "Quality / security gate success/failure notification", type: "yes_no_na" },
      { id: "an_artifacts", label: "Analysis results/artifacts are stored", type: "yes_no_na" }
    ]
  },
  {
    id: "cat_deploy",
    title: "Deploy",
    items: [
      { id: "dp_manual", label: "Manual trigger", type: "yes_no_na" },
      { id: "dp_depends", label: "Depends on", type: "text" },
      { id: "dp_logging", label: "Explicit deploy logging", type: "yes_no_na" },
      { id: "dp_test", label: "Test deploy", type: "yes_no_na" },
      { id: "dp_staging", label: "Staging deploy", type: "yes_no_na" },
      { id: "dp_prod", label: "Production deploy", type: "yes_no_na" },
      { id: "dp_standardized", label: "Deploy process is standardized for all environments", type: "yes_no_na" },
      { id: "dp_check", label: "Deploy success check", type: "yes_no_na" },
      { id: "dp_rollback", label: "Automated rollback", type: "yes_no_na" },
      { id: "dp_infra", label: "Infrastructure provisioning", type: "yes_no_na" },
      { id: "dp_db", label: "Automated database migration / preparation", type: "yes_no_na" },
      { id: "dp_zero_downtime", label: "Zero-downtime deploy", type: "yes_no_na" }
    ]
  }
];

export const maturityRules = [
  { level: 1, name: "Začetna", description: "Ad-hoc procesi.", minScore: 0 },
  { level: 2, name: "Upravljana", description: "Osnovna gradnja in ročni testi.", minScore: 25 },
  { level: 3, name: "Definirana", description: "Avtomatizirano testiranje in analiza.", minScore: 50 },
  { level: 4, name: "Kvantitativno upravljana", description: "Uveljavljena kakovostna vrata, avtomatizirano testno okolje.", minScore: 75 },
  { level: 5, name: "Optimizacijska", description: "Brez izpadov, samodejna povrnitev, močna varnost.", minScore: 90 }
];

export const mockPipelines = [
  {
    id: "p1",
    name: "Backend Service API",
    date: "2026-05-12",
    score: 65,
    level: 3,
    answers: {
      "b_manual": "DA", "b_logging": "DA", "b_artifacts": "DA",
      "ut_manual": "DA", "ut_terminate": "DA", "ut_report": "NE",
      "an_static": "DA", "an_gate_fail": "NE", "an_security": "NE"
    }
  }
];
