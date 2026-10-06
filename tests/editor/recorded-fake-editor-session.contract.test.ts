import { createRecordedFakeEditorSession } from '../../apps/editor'
import { defineEditorSessionContract } from './editor-session.contract'

defineEditorSessionContract('recorded FakeEditorSession', createRecordedFakeEditorSession)
