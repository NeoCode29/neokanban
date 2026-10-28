import { SPECIALIZATION_ROLES, getRoleMeta } from '../src/lib/member-roles'
import { PATCH } from '../src/app/api/boards/[id]/members/[memberId]/route'

async function runMemberRolesTests() {
  console.log('--- Testing Member Specialization Roles & APIs ---')

  // 1. Verify Role Metadata
  console.log('1. Checking Specialization Roles definition...')
  const expectedRoles = [
    'FRONTEND_SPECIALIST',
    'BACKEND_SPECIALIST',
    'FULLSTACK',
    'REVIEWER',
    'COLLABORATOR',
  ]

  for (const expected of expectedRoles) {
    const meta = getRoleMeta(expected)
    if (!meta || meta.id !== expected) {
      throw new Error(`Role meta for ${expected} is invalid: ${JSON.stringify(meta)}`)
    }
    console.log(`  ✓ ${meta.label} (${meta.id})`)
  }

  // Fallback test
  const fallback = getRoleMeta('UNKNOWN_ROLE')
  if (fallback.id !== 'COLLABORATOR') {
    throw new Error(`Expected fallback to COLLABORATOR, got ${fallback.id}`)
  }
  console.log('  ✓ Fallback correctly defaults to Collaborator')

  // 2. Test PATCH Validation for Invalid Role
  console.log('2. Testing PATCH member role validation...')
  process.env.TEST_AUTH_USER = JSON.stringify({
    id: 'owner-user-id',
    email: 'owner@example.com',
    name: 'Owner User',
  })

  // Invalid role test
  const invalidRoleReq = new Request('http://localhost:3000/api/boards/board-123/members/owner', {
    method: 'PATCH',
    body: JSON.stringify({ role: 'INVALID_ROLE_NAME' }),
  })
  const invalidRes = await PATCH(invalidRoleReq, {
    params: Promise.resolve({ id: 'board-123', memberId: 'owner' }),
  })

  console.log('  PATCH invalid role response status:', invalidRes.status)
  if (invalidRes.status !== 400) {
    throw new Error(`Expected 400 for invalid role, got ${invalidRes.status}`)
  }
  console.log('  ✓ Invalid role correctly rejected with status 400')

  delete process.env.TEST_AUTH_USER
  console.log('✅ ALL MEMBER ROLE TESTS PASSED SUCCESSFULLY!')
}

runMemberRolesTests()
  .then(() => process.exit(0))
  .catch((err) => {
    delete process.env.TEST_AUTH_USER
    console.error('❌ Test failed:', err)
    process.exit(1)
  })

