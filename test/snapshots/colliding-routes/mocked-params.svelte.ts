class MockedParams {
  packageId = $state<string | null>(null);
  controllerId = $state<string | null>(null);
}

const mockedParams = new MockedParams();
export default mockedParams;
