import { createRecordedFakeEditorSession } from '../../src/editor'
import { defineEditorSessionContract } from './editor-session.contract'

defineEditorSessionContract('recorded FakeEditorSession', createRecordedFakeEditorSession)
