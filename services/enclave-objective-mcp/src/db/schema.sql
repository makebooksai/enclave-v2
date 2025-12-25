-- Enclave V2: Objectives and Playbooks Schema
-- Created: December 24, 2025
-- Database: PostgreSQL (Forge database)
--
-- This schema supports the Objective → Playbook → Makebook pipeline

-- ============================================================================
-- OBJECTIVES TABLE
-- Stores refined objectives from enclave-objective-mcp
-- ============================================================================

CREATE TABLE IF NOT EXISTS objectives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Core Objective Fields
  title VARCHAR(500) NOT NULL,
  summary TEXT,
  intent TEXT NOT NULL,
  context TEXT,

  -- Structured Requirements (JSONB arrays)
  requirements JSONB DEFAULT '[]'::jsonb,
  -- Array of: { id, description, priority: 'must_have'|'should_have'|'nice_to_have', category? }

  constraints JSONB DEFAULT '[]'::jsonb,
  -- Array of: { id, description, type: 'technical'|'business'|'resource'|'regulatory'|'timeline' }

  success_criteria JSONB DEFAULT '[]'::jsonb,
  -- Array of: { id, description, measurable, metric? }

  -- Optional Fields
  project_type VARCHAR(100),           -- 'web_app', 'mobile_app', 'api', 'platform', etc.
  domain VARCHAR(100),                  -- Industry domain
  timeframe VARCHAR(100),               -- Timeline description
  budget VARCHAR(100),                  -- Budget description
  stakeholders JSONB DEFAULT '[]'::jsonb, -- Array of stakeholder names

  -- Capture Metadata
  source_mode VARCHAR(50) NOT NULL,    -- 'conversational' | 'structured'
  template_id VARCHAR(50),              -- Template used (if structured mode)
  quality_score DECIMAL(3,2) DEFAULT 0.00,
  completeness_score DECIMAL(3,2) DEFAULT 0.00,
  refinement_rounds INTEGER DEFAULT 0,

  -- Q&A Audit Trail
  questions_answered JSONB DEFAULT '[]'::jsonb,
  -- Array of: { questionId, question, answer, source: 'user'|'aurora'|'aspenify' }

  -- Reasoning Refinement (from enclave-reasoning-mcp)
  reasoning_session_id UUID,            -- Link to reasoning session
  reasoning_summary TEXT,               -- Summary of refinement dialogue

  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  -- Values: 'draft' | 'refined' | 'approved' | 'playbook_generated' | 'archived'

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  refined_at TIMESTAMP WITH TIME ZONE,
  approved_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for objectives
CREATE INDEX IF NOT EXISTS idx_objectives_status ON objectives(status);
CREATE INDEX IF NOT EXISTS idx_objectives_created ON objectives(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_objectives_source_mode ON objectives(source_mode);

-- ============================================================================
-- PLAYBOOKS TABLE
-- Stores generated playbooks from enclave-playbook-mcp
-- ============================================================================

CREATE TABLE IF NOT EXISTS playbooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Link to source objective
  objective_id UUID NOT NULL REFERENCES objectives(id) ON DELETE CASCADE,

  -- Core Playbook Fields
  title VARCHAR(500) NOT NULL,
  description TEXT,

  -- Aspenify Analysis Context
  aspenify_intent TEXT,
  aspenify_context TEXT,
  aspenify_type VARCHAR(100),

  -- Generated Playbook Content (full structure)
  content JSONB NOT NULL,
  -- Structure: { chapters: [{ name, description, sections: [{ name, description, subsections: [...] }] }] }

  -- Roles extracted from playbook
  roles JSONB DEFAULT '[]'::jsonb,
  -- Array of: { name, description, responsibilities: [] }

  -- Prerequisites
  prerequisites JSONB DEFAULT '[]'::jsonb,

  -- Generation metadata
  generation_metadata JSONB DEFAULT '{}'::jsonb,

  -- Q&A Audit Trail (Aspenify questions + AI answers)
  questions_asked JSONB DEFAULT '[]'::jsonb,
  -- Array of: { id, question, description, placeholder, questionType, mandatory }

  answers_provided JSONB DEFAULT '[]'::jsonb,
  -- Array of: { questionId, question, answer, answeredBy: 'ai'|'user' }

  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  -- Values: 'draft' | 'complete' | 'approved' | 'makebook_generated' | 'archived'

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  approved_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for playbooks
CREATE INDEX IF NOT EXISTS idx_playbooks_objective ON playbooks(objective_id);
CREATE INDEX IF NOT EXISTS idx_playbooks_status ON playbooks(status);
CREATE INDEX IF NOT EXISTS idx_playbooks_created ON playbooks(created_at DESC);

-- ============================================================================
-- PLAYBOOK STRUCTURE (Denormalized for querying)
-- Optional: For fast tree queries without parsing JSONB
-- ============================================================================

CREATE TABLE IF NOT EXISTS playbook_structure (
  id SERIAL PRIMARY KEY,

  playbook_id UUID NOT NULL REFERENCES playbooks(id) ON DELETE CASCADE,

  -- Hierarchy level
  level VARCHAR(20) NOT NULL, -- 'chapter' | 'section' | 'subsection'

  -- Position in tree
  chapter_idx INTEGER NOT NULL,
  section_idx INTEGER,       -- NULL for chapters
  subsection_idx INTEGER,    -- NULL for chapters and sections

  -- Content
  name VARCHAR(500) NOT NULL,
  description TEXT,

  -- Role assignments
  accountable_role VARCHAR(200),
  responsible_roles JSONB DEFAULT '[]'::jsonb,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for playbook structure
CREATE INDEX IF NOT EXISTS idx_playbook_structure_playbook ON playbook_structure(playbook_id);
CREATE INDEX IF NOT EXISTS idx_playbook_structure_position ON playbook_structure(playbook_id, chapter_idx, section_idx, subsection_idx);

-- ============================================================================
-- MAKEBOOKS TABLE
-- Stores generated makebooks from enclave-makebook-mcp
-- ============================================================================

CREATE TABLE IF NOT EXISTS makebooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Links to source artifacts
  objective_id UUID REFERENCES objectives(id) ON DELETE SET NULL,
  playbook_id UUID REFERENCES playbooks(id) ON DELETE SET NULL,

  -- Core Makebook Fields
  title VARCHAR(500) NOT NULL,
  objective_text TEXT,          -- The objective string (denormalized for easy access)

  -- Full Makebook Structure (JSONB)
  structure JSONB NOT NULL,
  -- Structure: {
  --   id, title, objective, created_at, source_playbook_id,
  --   tasks: [{
  --     id: 'TASK-001', title, description, phase, role,
  --     classification: 'AUTO'|'HYBRID'|'MANUAL',
  --     dependencies: [], deliverables: [], acceptance_criteria: [],
  --     estimated_complexity: 'trivial'|'simple'|'moderate'|'complex'|'epic'
  --   }],
  --   metadata: { total_tasks, auto_tasks, hybrid_tasks, manual_tasks, phases, roles, model_used, generation_time_ms }
  -- }

  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  -- Values: 'draft' | 'complete' | 'approved' | 'in_progress' | 'completed' | 'archived'

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for makebooks
CREATE INDEX IF NOT EXISTS idx_makebooks_objective ON makebooks(objective_id);
CREATE INDEX IF NOT EXISTS idx_makebooks_playbook ON makebooks(playbook_id);
CREATE INDEX IF NOT EXISTS idx_makebooks_status ON makebooks(status);
CREATE INDEX IF NOT EXISTS idx_makebooks_created ON makebooks(created_at DESC);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE objectives IS 'Stores refined objectives from enclave-objective-mcp, ready for Playbook generation';
COMMENT ON TABLE playbooks IS 'Stores generated playbooks from enclave-playbook-mcp via Aspenify';
COMMENT ON TABLE playbook_structure IS 'Denormalized playbook structure for fast tree queries';
COMMENT ON TABLE makebooks IS 'Stores generated makebooks from enclave-makebook-mcp with task breakdowns';

COMMENT ON COLUMN objectives.source_mode IS 'How the objective was captured: conversational (Aurora-led) or structured (template-based)';
COMMENT ON COLUMN objectives.reasoning_session_id IS 'UUID of the enclave-reasoning-mcp session used for refinement';
COMMENT ON COLUMN objectives.questions_answered IS 'Full audit trail of all Q&A during capture';

COMMENT ON COLUMN playbooks.content IS 'Full playbook structure as JSONB (chapters → sections → subsections)';
COMMENT ON COLUMN playbooks.answers_provided IS 'AI-generated answers to Aspenify questions';

COMMENT ON COLUMN makebooks.structure IS 'Full makebook with tasks, dependencies, and classifications';
COMMENT ON COLUMN makebooks.objective_text IS 'Denormalized objective text for quick access';
