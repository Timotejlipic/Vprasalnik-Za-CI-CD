
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
	NEW.updated_at = CURRENT_TIMESTAMP;
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE questionnaire_configs (
	id BIGSERIAL PRIMARY KEY,

	version VARCHAR(50) NOT NULL,
	title VARCHAR(255) NOT NULL,
	description TEXT,

	is_active BOOLEAN NOT NULL DEFAULT TRUE,

	created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

	CONSTRAINT uq_qustionnaire_version UNIQUE (version)
);

CREATE TRIGGER trg_questionnaire_configs_updated_at
BEFORE UPDATE ON questionnaire_configs
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();


CREATE TABLE questionnaire_items (
	id BIGSERIAL PRIMARY KEY,

	questionnaire_config_id BIGINT NOT NULL
		REFERENCES questionnaire_configs(id) on DELETE CASCADE,

	parent_id BIGINT NULL
		REFERENCES questionnaire_items(id) ON DELETE CASCADE,

	item_key VARCHAR(150) NOT NULL,
	label VARCHAR(500) NOT NULL,
	description TEXT,

	type VARCHAR(50) NOT NULL,

	depth INT NOT NULL DEFAULT 1,
	sort_order INT NOT NULL DEFAULT 0,

	is_active BOOLEAN NOT NULL DEFAULT TRUE,

	created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

	CONSTRAINT uq_questionnaire_item_key_per_config
        UNIQUE (questionnaire_config_id, item_key),

    CONSTRAINT chk_questionnaire_item_type
        CHECK (type IN ('checkbox', 'multiselect', 'numeric', 'text')),

    CONSTRAINT chk_questionnaire_item_depth
        CHECK (depth BETWEEN 1 AND 3),

	CONSTRAINT chk_parent_depth_logic
        CHECK (
            (parent_id IS NULL AND depth = 1)
            OR
            (parent_id IS NOT NULL AND depth IN (2, 3))
        )
);

CREATE TRIGGER trg_questionnaire_items_updated_at
BEFORE UPDATE ON questionnaire_items
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE FUNCTION validate_questionnaire_item_parent()
RETURNS TRIGGER AS $$
DECLARE 
	parent_depth INT;
	parent_config_id BIGINT;
BEGIN
	IF NEW.parent_id IS NULL THEN
		IF NEW.depth <> 1 then
			RAISE EXCEPTION 'Root questionnaire item must have depth = 1';
		END IF;

		RETURN NEW;
	END IF;

	SELECT depth, questionnaire_config_id
	INTO parent_depth, parent_config_id
	FROM questionnaire_items
	WHERE id = NEW.parent_id;

	IF parent_depth IS NULL THEN 
		RAISE EXCEPTION 'parent questionnaire item does not exist';
	END IF;

	IF parent_config_id <> NEW.questionnaire_config_id THEN
		RAISE EXCEPTION 'Parent item must belong to the same questionnaire config';
	END IF;

	IF NEW.depth <> parent_depth + 1 THEN
		RAISE EXCEPTION 'Invalid depth. Child depth must be parent depth + 1';
	END IF;

	IF NEW.depth > 3 then
		RAISE EXCEPTION 'questionnaire supports maximum deoth of 3';
	END IF;

	RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_questionnaire_item_parent
BEFORE INSERT OR UPDATE ON questionnaire_items
FOR EACH ROW 
EXECUTE FUNCTION validate_questionnaire_item_parent();

CREATE TABLE questionnaire_item_options (
	id BIGSERIAL PRIMARY KEY,

	questionnaire_item_id BIGINT NOT NULL
		REFERENCES questionnaire_items(id)
		ON DELETE CASCADE,

	value VARCHAR(200) NOT NULL,
	label VARCHAR(200) NOT NULL,

	sort_order INT NOT NULL DEFAULT 0,

	created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

	CONSTRAINT uq_option_value_per_item 
		UNIQUE (questionnaire_item_id, value)
);

CREATE TABLE pipelines (
	id BIGSERIAL PRIMARY KEY,

	questionnaire_config_id BIGINT NOT NULL
		REFERENCES questionnaire_configs(id)
		ON DELETE RESTRICT,

	name VARCHAR(200) NOT NULL,
	project_name VARCHAR(200),
	description TEXT,
	repository_url VARCHAR(500),
	technology VARCHAR(255),

	current_maturity_level INT NOT NULL DEFAULT 0,

	created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP

);

CREATE TRIGGER trg_pipelines_updated_at
BEFORE UPDATE ON pipelines
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE pipeline_answers (
	id BIGSERIAL PRIMARY KEY,

	pipeline_id BIGINT NOT NULL
		REFERENCES pipelines(id) ON DELETE CASCADE,

	questionnaire_item_id BIGINT NOT NULL
		REFERENCES questionnaire_items(id) ON DELETE RESTRICT,

	answer_value JSONB NOT NULL,

	created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

	CONSTRAINT uq_answer_per_pipeline_item
		UNIQUE (pipeline_id, questionnaire_item_id)
	
);

CREATE TRIGGER trg_pipeline_answers_updated_at
BEFORE UPDATE ON pipeline_answers
FOR EACH ROW 
EXECUTE FUNCTION set_updated_at();

CREATE TABLE maturity_levels (
	id BIGSERIAL PRIMARY KEY,

	questionnaire_config_id BIGINT NOT NULL
		REFERENCES questionnaire_configs(id) ON DELETE CASCADE,

	level_number INT NOT NULL,
	name VARCHAR(200) NOT NULL,
	description TEXT,

	sort_order INT NOT NULL DEFAULT 0,

	created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

	CONSTRAINT uq_maturity_level_per_config
		UNIQUE (questionnaire_config_id, level_number),

	CONSTRAINT chk_maturity_level_number
		CHECK (level_number >= 1)
);

CREATE TRIGGER trg_maturity_levels_updated_at
BEFORE UPDATE ON maturity_levels
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE maturity_rules (
	id BIGSERIAL PRIMARY KEY,

	maturity_level_id BIGINT NOT NULL
		REFERENCES maturity_levels(id) ON DELETE CASCADE,

	questionnaire_item_id BIGINT NOT NULL
		REFERENCES questionnaire_items(id) ON DELETE RESTRICT,

	operator VARCHAR(200) NOT NULL,
	expected_value JSONB NOT NULL,

	description TEXT,

	sort_order INT NOT NULL DEFAULT 0,

	created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

	CONSTRAINT chk_maturity_rule_operator
		CHECK (operator IN (
			'equals',
			'not_equals',
			'gte',
			'lte',
			'gt',
			'lt',
			'contains',
			'contains_all',
			'contains_any',
			'is_checked',
			'is_not_empty'
		))
);

CREATE TRIGGER trg_maturity_rules_updated_at
BEFORE UPDATE ON maturity_rules
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE pipeline_evaluations (
	id BIGSERIAL PRIMARY KEY,

	pipeline_id BIGINT NOT NULL
		REFERENCES pipelines(id)
		ON DELETE CASCADE,
	
	achieved_level INT NOT NULL DEFAULT 0,
	
	maturity_level_id BIGINT NULL
		REFERENCES maturity_levels(id) ON DELETE SET NULL,

	missing_requirements JSONB NOT NULL DEFAULT '[]'::jsonb,
	fulfilled_requirements JSONB NOT NULL DEFAULT '[]'::jsonb,

	evaluated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

	CONSTRAINT chk_achieved_level CHECK (achieved_level >= 0)

);

CREATE TABLE questionnaire_import_exports (
	id BIGSERIAL PRIMARY KEY,

	questionnaire_config_id BIGINT NULL
		REFERENCES questionnaire_configs(id) ON DELETE SET NULL,

	operation VARCHAR(200) NOT NULL,
	file_name VARCHAR(200),
	json_payload JSONB NOT NULL,

	created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

	CONSTRAINT chk_import_export_operation
		check (operation IN ('IMPORT', 'EXPORT'))
);

CREATE TABLE app_users (
    id BIGSERIAL PRIMARY KEY,

    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,

    password_hash TEXT NOT NULL,

    role VARCHAR(50) NOT NULL DEFAULT 'user',

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_app_user_role
        CHECK (role IN ('user', 'admin'))
);

CREATE TRIGGER trg_app_users_updated_at
BEFORE UPDATE ON app_users
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

ALTER TABLE pipelines
ADD COLUMN created_by_user_id BIGINT NULL
    REFERENCES app_users(id)
    ON DELETE SET NULL;

CREATE INDEX idx_pipelines_created_by_user
    ON pipelines(created_by_user_id);

CREATE INDEX idx_questionnaire_items_config
	ON questionnaire_items(questionnaire_config_id);

CREATE INDEX idx_questionnaire_items_parent
	ON questionnaire_items(parent_id);

CREATE INDEX idx_questionnaire_items_depth
	ON questionnaire_items(depth);

CREATE INDEX idx_questionnaire_item_options_item
	ON questionnaire_item_options(questionnaire_item_id);

CREATE INDEX idx_pipelines_config
	ON pipelines(questionnaire_config_id);

CREATE INDEX idx_pipeline_answers_pipeline
	ON pipeline_answers(pipeline_id);

CREATE INDEX idx_pipeline_answers_item
	ON pipeline_answers(questionnaire_item_id);

CREATE INDEX idx_maturity_levels_config
	ON maturity_levels(questionnaire_config_id);

CREATE INDEX idx_maturity_rules_level
	ON maturity_rules(maturity_level_id);

CREATE INDEX idx_maturity_rules_item
    ON maturity_rules(questionnaire_item_id);

CREATE INDEX idx_pipeline_evaluations_pipeline
	ON pipeline_evaluations(pipeline_id);

CREATE INDEX idx_questionnaire_import_exports_config
	ON questionnaire_import_exports(questionnaire_config_id);
