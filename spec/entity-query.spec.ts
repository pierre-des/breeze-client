import { breeze, EntityManager, EntityQuery, NamingConvention, Predicate, EntityType, EntityState, EntityKey, Entity } from 'breeze-client';
import { skipTestIf, TestFns, expectPass } from './test-fns';

// TODO:
TestFns.initServerEnvName("ASPCORE");

describe("EntityQuery", () => {

  beforeEach(function () {

  });
  

  test("should allow simple metadata query", async () => {
    let em = new EntityManager('test');
    let ms = em.metadataStore;
    const metadata = await ms.fetchMetadata(TestFns.defaultServiceName);
    expect(metadata).not.toBeNull();
    
  });

  test("should allow simple entity query", async () => {
    expect.assertions(2);
    let em = TestFns.newEntityManager();
    let ms = em.metadataStore;
    
    let query = new EntityQuery("Customers");
    expect(query.resourceName).toEqual("Customers");

    const qr = await em.executeQuery(query);
    expect(qr.results.length).toBeGreaterThan(100);

  });

  test("can handle simple json query syntax ", async() => {
    expect.assertions(1);
    let em = TestFns.newEntityManager();
    const query = EntityQuery.from('Customers').using(em).where({ 'city': { '==': 'London' } });
    const url = query._toUri(em);
    
    const qr = await em.executeQuery(query);
    
    const r = qr.results;
    expect(r.length).toBeGreaterThan(0);
  });

  test("JSON can use 'not' array with 'in' inside 'and'", async() => {
    const countries = ['Belgium', 'Germany'];
    const p2 = {
      and: [
        { companyName: { startswith: 'B' } },
        { not: { country: { in: countries } } }
      ]
    };

    const p = Predicate.create(p2);
    const q = new EntityQuery("Customers").where(p);
    const em = TestFns.newEntityManager();
    const qr = await em.executeQuery(q);
    const r = qr.results;
    expect(r.length).toBe(6);
    r.forEach((cust) => {
      expect(countries.indexOf(cust.country) < 0).toBe(true);
    });
    expect.assertions(7);
  });

  test("can handle parens in right hand side of predicate", async() => {
    const em = TestFns.newEntityManager();
    const query = new EntityQuery("Customers");
    // a valid query that returns no data
    const q2 = query.where('city', 'startsWith', 'Lon (don )');

    const qr = await em.executeQuery(q2);
    expect(qr.results.length).toBe(0);
    expect.assertions(1);
  });

  test("should not throw when add where clause to query with a `.fromEntityType` value", async() => {
    const em = TestFns.newEntityManager();
    const query = new EntityQuery("Customers");
    await TestFns.initDefaultMetadataStore(); // needed because a local query need to have an ms
    // Don't care about the query result.
    // Just want the `fromEntityType` property to set as a side effect or execution
    em.executeQueryLocally(query);
    // now we can repro the bug reported in https://github.com/Breeze/breeze.js/issues/44
    // This next statement throws the "undefined is not a function" exception in 1.5.1
    const q2 = query.where('city', 'eq', 'London');

    const qr = await em.executeQuery(q2);
    expect(qr.results.length).toBeGreaterThan(0);
    expect.assertions(1)  ;
  });

  test("query with 'in' clause", async () =>  {
    expect.assertions(3);
    const em1 = TestFns.newEntityManager();

    const countries = ['Austria', 'Italy', 'Norway']
    const query = EntityQuery.from("Customers")
      .where("country", 'in', countries);

    const qr1 = await em1.executeQuery(query);
    const r = qr1.results;
    expect(r.length).toBeGreaterThan(0);
     
    const isOk = r.every((cust) => {
      return countries.indexOf(cust.getProperty("country")) >= 0;
    });
    expect(isOk).toBe(true);

    const r2 = em1.executeQueryLocally(query);
    expect(r2.length).toBe(r.length);
    
  });

  //Using EntityManager em1, query Entity A and it's nav property (R1) Entity B1.
  //Using EntityManager em2, query A and change it's nav property to B2. Save the change.
  //Using EntityManager em1, still holding A and B1, query A, including it's expanded nav property R1.
  //In R1.subscribeChanges, the correct new value of B2 will exist as R1's value but it will have a status of "Detached".
  test("nav prop change and expand", async() => {
    const em1 = TestFns.newEntityManager();
    const em2 = TestFns.newEntityManager();
    const p = Predicate.create("freight", ">", 100).and("customerID", "!=", null);
    const query = new EntityQuery()
      .from("Orders")
      .where(p)
      .orderBy("orderID")
      .expand("customer")
      .take(1);

    let oldCust, newCust1a, newCust1b, order1, order1a, order1b;
    const qr1 = await em1.executeQuery(query);

    order1 = qr1.results[0];
    oldCust = order1.getProperty("customer");
    expect(oldCust).not.toBeNull();
    const qr2 = await em2.executeQuery(EntityQuery.fromEntityKey(order1.entityAspect.getKey()));
    
    order1a = qr2.results[0];
    expect(order1.entityAspect.getKey()).toEqual(order1a.entityAspect.getKey());

    const customerType = em2.metadataStore.getEntityType("Customer") as EntityType;
    newCust1a = customerType.createEntity();
    newCust1a.setProperty("companyName", "Test_compName");
    order1a.setProperty("customer", newCust1a);

    const sr = await em2.saveChanges();

    em1.entityChanged.subscribe((args) => {
      const entity = args.entity;
      expect(entity).not.toBeNull();
      expect(entity.entityAspect.entityState).not.toEqual(EntityState.Detached);
    });

    const qr3 = await em1.executeQuery(query);
    
    order1b = qr3.results[0];
    expect(order1b).toBe(order1);
    newCust1b = order1b.getProperty("customer");
    expect(newCust1a.entityAspect.getKey()).toEqual(newCust1b.entityAspect.getKey());
    expect(newCust1b).not.toBeNull();
    expect(newCust1b.entityAspect.entityState.isUnchanged()).toBe(true);
  });

  test("by entity key without preexisting metadata", async () => {
    expect.assertions(1);
    const manager = new EntityManager(TestFns.defaultServiceName);

    await manager.fetchMetadata();
    const empType = manager.metadataStore.getEntityType("Employee") as EntityType;
    const entityKey = new EntityKey(empType, 1);
    const query = EntityQuery.fromEntityKey(entityKey);
    const qr = await manager.executeQuery(query);
    
    expect(qr.results.length).toBe(1);
  });

  test("same field twice", async() => {
    const em1 = TestFns.newEntityManager();
    const p = Predicate.create("freight", ">", 100).and("freight", "<", 200);
    const query = new EntityQuery()
      .from("Orders")
      .where(p);

    const qr1 = await em1.executeQuery(query);
    const orders = qr1.results;
    expect(orders.length).toBeGreaterThan(0);
    orders.forEach(function (o) {
      const f = o.getProperty("freight");
      expect(f > 100 && f < 200).toBe(true);
    });
    
  });

  test("with bad criteria", async() => {
    expect.assertions(1);
    const em1 = TestFns.newEntityManager();
    const query = new EntityQuery()
      .from("Employees")
      .where("badPropName", "==", "7");
    try {  
      const qr = await em1.executeQuery(query);
      throw new Error('should have thrown an error');
    } catch {
      expect(true).toBe(true);
    }
  });

  test("with bad criteria - 2", async() => {
    expect.assertions(1);
    const em1 = TestFns.newEntityManager();
    const query = new EntityQuery()
      .from("AltCustomers")
      .where("xxxx", "<", 7);
    try {  
      const qr = await em1.executeQuery(query);
      throw new Error('should have thrown an error');
    } catch {
      expect(true).toBe(true);
    }
  });

  test("expand not working with paging or inlinecount", async() => {
    
    const em1 = TestFns.newEntityManager();
    const predicate = Predicate.create(TestFns.wellKnownData.keyNames.order, "<", 10500);

    const query = new EntityQuery()
      .from("Orders")
      .expand("orderDetails, orderDetails.product")
      .where(predicate)
      .inlineCount()
      .orderBy("orderDate")
      .take(2)
      .skip(1)
      .using(em1);
    const qr1 = await query.execute();

    expect(qr1.results.length).toBeGreaterThan(0);
    expect(qr1.inlineCount).toBeGreaterThan(0);

    // For ODATA this is a known bug: https://aspnetwebstack.codeplex.com/workitem/1037
    // having to do with mixing expand and inlineCount
    // it sounds like it might already be fixed in the next major release but not yet avail.
    const localQuery = EntityQuery.from('OrderDetails');
    const orderDetails = em1.executeQueryLocally(localQuery);
    expect(orderDetails.length).toBeGreaterThan(0);

    const localQuery2 = EntityQuery.from('Products');
    const products = em1.executeQueryLocally(localQuery2);
    expect(products.length).toBeGreaterThan(0);
    
  });

  test("test date in projection", async() => {
    const em1 = TestFns.newEntityManager();
    const q1 = EntityQuery
      .from("Orders")
      .where("orderDate", "!=", null)
      .orderBy("orderDate")
      .take(3);
    const qr1 = await em1.executeQuery(q1);
    const result = qr1.results[0];
    const orderDate = result.getProperty("orderDate");
    expect(breeze.core.isDate(orderDate)).toBe(true);

    const em2 = TestFns.newEntityManager();
    const q2 = EntityQuery
      .from("Orders")
      .where("orderDate", "!=", null)
      .orderBy("orderDate")
      .take(3)
      .select("orderDate");
    const qr2 = await em2.executeQuery(q2);
    
    const orderDate2 = qr2.results[0].orderDate;
    let orderDate2a;
    if (TestFns.isODataServer) {
      expect(breeze.core.isDate(orderDate2)).toBe(true);
      orderDate2a = orderDate2;
    } else {
      // orderDate projection should not be a date except with ODATA'"
      expect(breeze.core.isDate(orderDate2)).toBe(false);
      // now it will be a date
      orderDate2a = breeze.DataType.parseDateFromServer(orderDate2);
    }
    expect(orderDate.getTime()).toBe(orderDate2a.getTime());
  });

  test("empty predicates", async() => {
    const em1 = TestFns.newEntityManager();
    const predicate1 = Predicate.create("lastName", "startsWith", "D");
    const predicate2 = Predicate.create("firstName", "startsWith", "A");
    const predicates = Predicate.or([undefined, predicate1, null, predicate2, null]);
    const query = new breeze.EntityQuery()
      .from("Employees")
      .where(predicates);

    const qr1 = await em1.executeQuery(query);
    expect(qr1.results.length).toBeGreaterThan(0);
    qr1.results.forEach( (e) => {
      const firstName = e.getProperty("firstName");
      const lastName = e.getProperty("lastName");
      const ok1 = firstName && firstName.indexOf("A") === 0;
      const ok2 = lastName && lastName.indexOf("D") === 0;
      expect(ok1 || ok2).toBe(true);
    });
  });

  test("empty predicates 2", async() => {
    expect.assertions(1);
    const em1 = TestFns.newEntityManager();
    const predicates = Predicate.and([]);
    const query = EntityQuery
      .from("Employees")
      .where(predicates);

    const qr1 = await em1.executeQuery(query);
    expect(qr1.results.length).toBeGreaterThan(6);
  });

  test("empty predicates 3", async() => {
    expect.assertions(2);
    const em1 = TestFns.newEntityManager();
    const predicate1 = Predicate.create("lastName", "startsWith", "D").or("firstName", "startsWith", "A");
    const predicates = Predicate.and([null, undefined, predicate1]);
    const query = EntityQuery
      .from("Employees")
      .where(predicates);

    const qr1 = await em1.executeQuery(query);
    expect(qr1.results.length).toBeGreaterThan(0);
    
    const empId = qr1.results[0].getProperty(TestFns.wellKnownData.keyNames.employee);
    if (!TestFns.isMongoServer) {
      expect(empId).toBeLessThan(6);
    } else {
      expectPass();
    }
  });

  test("empty predicates 4", async() => {
    expect.assertions(1);
    const em1 = TestFns.newEntityManager();
    const predicates = Predicate.and([undefined, null, null]);
    const query = EntityQuery
      .from("Employees")
      .where(predicates);
    const qr1 = await em1.executeQuery(query);
    expect(qr1.results.length).toBeGreaterThan(0);
  });

  test("empty clauses", async() => {
    expect.assertions(1);
    const em1 = TestFns.newEntityManager();
    const query = EntityQuery
      .from("Employees")
      .where().orderBy().select().expand().take().skip();

    const qr1 = await em1.executeQuery(query);
    expect(qr1.results.length).toBeGreaterThan(0);
  });

  test("empty clauses - 2", async() => {
    expect.assertions(1);
    const em1 = TestFns.newEntityManager();
    const query = EntityQuery
      .from("Employees")
      .where(null).orderBy(null).select(null).expand(null).take(null).skip(null);
    const qr1 = await em1.executeQuery(query);
    expect(qr1.results.length).toBeGreaterThan(0);
  });

  // TODO: Update for these later
  // skipIfHibFuncExpr.
  //  skipIf("mongo", "does not yet support 'year' function").
  test("function expr - date(year) function", async() => {
    expect.assertions(2);
    const em1 = TestFns.newEntityManager();
    const query = EntityQuery
      .from("Employees")
      .where("year(hireDate)", ">", 1993);
    const qr1 = await em1.executeQuery(query);
    expect(qr1.results.length).toBeGreaterThan(0);
    const emps2 = em1.executeQueryLocally(query);
    expect(emps2.length).toBe(qr1.results.length);
  });

  // skipIfHibFuncExpr.
  // skipTestIf("mongo", "does not support 'year' odata predicate").
  test("function expr - date(month) function", async() => {
    const em1 = TestFns.newEntityManager();
    const p = Predicate.create("month(hireDate)", ">", 6).and("month(hireDate)", "<", 11);
    const query = EntityQuery
      .from("Employees")
      .where(p);

    const qr1 = await em1.executeQuery(query);
    expect(qr1.results.length).toBeGreaterThan(0);
    const emps2 = em1.executeQueryLocally(query);
    expect(emps2.length).toBe(qr1.results.length);
  });

  test("take(0)", async() => {
    expect.hasAssertions();
    const em1 = TestFns.newEntityManager();
    const query = EntityQuery
      .from("Customers")
      .take(0);
    const qr1 = await em1.executeQuery(query);
    expect(qr1.results.length).toBe(0);
  });

  test("take(0) with inlinecount", async() => {
    expect.hasAssertions();
    const em1 = TestFns.newEntityManager();
    const query = EntityQuery
      .from("Customers")
      .take(0)
      .inlineCount();
    const qr1 = await em1.executeQuery(query);
    expect(qr1.results.length).toBe(0);
    expect(qr1.inlineCount).toBeGreaterThan(0);
  });

  test("select with inlinecount", async() => {
    expect.hasAssertions();
    const em1 = TestFns.newEntityManager();
    const query = EntityQuery
      .from("Customers")
      .select("companyName, region, city")
      .inlineCount();
    const qr1 = await em1.executeQuery(query);
    expect(qr1.results.length).toBe(qr1.inlineCount);
  });

  test("select with inlinecount and take", async() => {
    expect.hasAssertions();
    const em1 = TestFns.newEntityManager();
    const query = EntityQuery
      .from("Customers")
      .select("companyName, region, city")
      .take(5)
      .inlineCount();
    const qr1 = await em1.executeQuery(query);
    expect(qr1.results.length).toBe(5);
    expect(qr1.inlineCount).toBeGreaterThan(5);
  });

  test("select with inlinecount and take and orderBy", async() => {
    expect.hasAssertions();
    const em1 = TestFns.newEntityManager();
    const query = EntityQuery
      .from("Customers")
      .select("companyName, region, city")
      .orderBy("city, region")
      .take(5)
      .inlineCount();
    const qr1 = await em1.executeQuery(query);
    expect(qr1.results.length).toBe(5);
    expect(qr1.inlineCount).toBeGreaterThan(5);
    // TODO: test if qr1.results are ordered by city and region
  });

  test("check getEntityByKey", async() => {
    expect.hasAssertions();
    const em1 = TestFns.newEntityManager();
    const query = EntityQuery
      .from("Customers");
    const qr1 = await em1.executeQuery(query);
    
    const cust1 = qr1.results[0];
    const key = cust1.getProperty(TestFns.wellKnownData.keyNames.customer);
    const cust2 = em1.getEntityByKey("Customer", key);
    expect(cust1).toBe(cust2);
  });

  test("local cache query for all Suppliers in fax 'Papa'", async() => {
    expect.hasAssertions();
    const em1 = TestFns.newEntityManager();
    const query = new breeze.EntityQuery("Suppliers");
    const qr1 = await em1.executeQuery(query);
    expect(qr1.results.length).toBeGreaterThan(0);
    const predicate = breeze.Predicate.create(TestFns.wellKnownData.keyNames.supplier, '==', 0)
      .or('fax', '==', 'Papa');
    const localQuery = breeze.EntityQuery
      .from('Suppliers')
      .where(predicate)
      .toType('Supplier');

    const suppliers = em1.executeQueryLocally(localQuery);
    // Defect #2486 Fails with "Invalid ISO8601 duration 'Papa'"
    expect(suppliers.length).toBe(0);
    
  });

  test("inlineCount when ordering results by simple navigation path", async() => {
    expect.hasAssertions();
    const em1 = TestFns.newEntityManager();
    const pred = new Predicate("shipCity", "startsWith", "A");
    const query = EntityQuery
      .from("Orders")
      .where(pred)
      .orderBy("customerID");
    // .orderBy("customer.companyName")
    const qr1 = await em1.executeQuery(query);
    const totalCount = qr1.results.length;
    expect(totalCount).toBeGreaterThan(3);
    const q2 = query.inlineCount(true).take(3);
    const qr2 = await em1.executeQuery(q2);
    expect(qr2.results.length).toBe(3);
    expect(qr2.inlineCount).toBe(totalCount);
  });

  test("inlineCount when ordering results by nested navigation path", async() => {
    expect.hasAssertions();
    const em1 = TestFns.newEntityManager();
    const pred = new Predicate("shipCity", "startsWith", "A");
    const query = breeze.EntityQuery.from("Orders")
      .where(pred)
      .orderBy("customer.companyName");
    const qr1 = await em1.executeQuery(query);
    const totalCount = qr1.results.length;
    expect(totalCount).toBeGreaterThan(3);
    const q2 = query.inlineCount(true).take(3);
    const qr2 = await em1.executeQuery(q2);
    expect(qr2.results.length).toBe(3);
    expect(qr2.inlineCount).toBe(totalCount);
  });

  test("getAlfred", async() => {
    expect.hasAssertions();
    const em1 = TestFns.newEntityManager();
    const query = EntityQuery.from("Customers").where("companyName", "startsWith", "Alfreds");
    const qr1 = await em1.executeQuery(query);
    const alfred = qr1.results[0];
    const alfredsID = alfred.getProperty(TestFns.wellKnownData.keyNames.customer).toLowerCase();
    expect(alfredsID).toEqual(TestFns.wellKnownData.alfredsID);
  });

  test("URL malformed with bad resource name combined with 'startsWith P'", async() => {
    expect.hasAssertions();
    const em1 = TestFns.newEntityManager();
    // we intentionally mispelled the resource name to cause the query to fail
    const query = EntityQuery.from("Customer").where("companyName", "startsWith", "P");

    try {
      const qr1 = await em1.executeQuery(query);
      throw new Error('should not get here');
    } catch ( error) {
      if (TestFns.isMongoServer) {
        expect(error.message.indexOf("Unable to locate") >= 0).toBe(true);
      } else if (TestFns.isODataServer) {
        expect(error.message.indexOf("Not Found") >= 0).toBe(true);
      } else if (TestFns.isSequelizeServer) {
        expect(error.message.indexOf("Cannot find an entityType") > 0).toBe(true);
      } else if (TestFns.isHibernateServer) {
        expect(error.message.indexOf("no entityType name registered") > 0).toBe(true);
      } else if (TestFns.isAspCoreServer) {
        expect(error.status === 404).toBe(true);
      } else {
        expect(error.message.indexOf("No HTTP resource was found") >= 0).toBe(true);
      }
    }
  });

  skipTestIf(TestFns.isMongoServer)
  ("with take, orderby and expand", async() => {
    expect.hasAssertions();
    const em1 = TestFns.newEntityManager();
    const q1 = EntityQuery.from("Products")
      .expand("category")
      .orderBy("category.categoryName desc, productName");
    const qr1 = await em1.executeQuery(q1);
    const topTen = qr1.results.slice(0, 10);
    const q2 = q1.take(10);
    const qr2 = await em1.executeQuery(q2);
    const topTenAgain = qr2.results;
    expect(topTen).toEqual(topTenAgain);
  });

  skipTestIf(TestFns.isMongoServer)
  ("with take, skip, orderby and expand", async() => {
    expect.hasAssertions();
    const em1 = TestFns.newEntityManager();
    const q1 = EntityQuery.from("Products")
      .expand("category")
      .orderBy("category.categoryName, productName");
    const qr1 = await em1.executeQuery(q1);
    const nextTen = qr1.results.slice(10, 20);
    const q2 = q1.skip(10).take(10);
    const qr2 = await em1.executeQuery(q2);
    const nextTenAgain = qr2.results;
    expect(nextTen).toEqual(nextTenAgain);
  });

  test("with quotes", async() => {
    expect.hasAssertions();
    const em1 = TestFns.newEntityManager();
    const q1 = EntityQuery.from("Customers")
      .where("companyName", 'contains', "'")
      .using(em1);
    const qr1 = await q1.execute();
    expect(qr1.results.length).toBeGreaterThan(0);
    const r = em1.executeQueryLocally(q1);
    expect(r.length).toBe(qr1.results.length);
  });

  test("with embedded ampersand", async() => {
    expect.hasAssertions();
    const em1 = TestFns.newEntityManager();
    const q1 = EntityQuery.from("Customers")
      .where('companyName', 'contains', '&')
      .using(em1);
    const qr1 = await q1.execute();
    expect(qr1.results.length).toBeGreaterThan(0);
    const r = em1.executeQueryLocally(q1);
    expect(r.length).toBe(qr1.results.length);
  });

  test("bad query test", async() => {
    expect.hasAssertions();
    const em1 = TestFns.newEntityManager();
    try {
      const qr1 = await EntityQuery.from("EntityThatDoesnotExist")
        .using(em1)
        .execute();
      throw new Error('should not get here') ;
    } catch (e) {
      if (TestFns.isODataServer) {
        expect(e.message === "Not Found").toBe(true);
      } else if (TestFns.isAspCoreServer) {
        expect(e.status === 404).toBe(true);
      } else {
        expect(e.message && e.message.toLowerCase().indexOf("entitythatdoesnotexist") >= 0).toBe(true);
      }
    }
  });

  skipTestIf(TestFns.isMongoServer)
  ("nested expand", async() => {
    expect.hasAssertions();
    const em1 = TestFns.newEntityManager();
    const q1 = EntityQuery.from("OrderDetails").where("orderID", "<", 10255).expand("order.customer");
    const qr1 = await em1.executeQuery(q1);
      
    const details = qr1.results;
    details.forEach( (od) => {
      const order = od.getProperty("order");
      expect(order).not.toBeNull();
      if (order.getProperty("customerID")) {
        const customer = order.getProperty("customer");
        expect(customer).not.toBeNull();
      }
    });

   });

   skipTestIf(TestFns.isMongoServer)
   ("nested expand 3 level", async() => {
    expect.assertions(3);
    const em1 = TestFns.newEntityManager();
    const q1 = EntityQuery.from("Orders").take(5).expand("orderDetails.product.category");
    const qr1 = await em1.executeQuery(q1);
    const orders = qr1.results;
    const orderDetails = orders[0].getProperty("orderDetails");
    expect(orderDetails.length).toBeGreaterThan(0);
    const product = orderDetails[0].getProperty("product");
    expect(product).not.toBeNull();
    const category = product.getProperty("category");
    expect(category).not.toBeNull();
  });

  skipTestIf(TestFns.isMongoServer)
  ("retrievedEntities - nested expand 2 level", async() => {
    expect.hasAssertions();
    const em1 = TestFns.newEntityManager();
    const q1 = EntityQuery.from("OrderDetails").take(5).expand("order.customer");
    const qr1 = await em1.executeQuery(q1);
    const entities = qr1.retrievedEntities;
    expect(entities).not.toBeNull();
    expect(entities.length).toBeGreaterThan(5);
    const details = qr1.results;

    const isOk = details.some(function (od) {
      expect(entities.indexOf(od) >= 0).toBe(true);
      const order = od.getProperty("order");
      expect(entities.indexOf(order) >= 0).toBe(true);
      const cust = order.getProperty("customer");
      if (cust) {
        expect(entities.indexOf(cust) >= 0).toBe(true);
        return true;
      } else {
        return false;
      }
    });
    expect(isOk).toBe(true);
  });

  skipTestIf(TestFns.isMongoServer)
  ("retrievedEntities - nested expand 3 level", async() => {
    expect.hasAssertions();
    const em1 = TestFns.newEntityManager();
    const q1 = EntityQuery.from("Orders").take(5).expand("orderDetails.product.category");
    const qr1 = await em1.executeQuery(q1);
    
    const entities = qr1.retrievedEntities;
    expect(entities).not.toBeNull();
    const orders = qr1.results;
    for (let i = 0, ilen = orders.length; i < ilen; i++) {
      expect(entities.indexOf(orders[i]) >= 0).toBe(true);
      const orderDetails = orders[i].getProperty("orderDetails");
      for (let j = 0, jlen = orderDetails.length; j < jlen; j++) {
        expect(entities.indexOf(orderDetails[j]) >= 0).toBe(true);
        expect(entities.indexOf(orderDetails[j].getProperty("product")) >= 0).toBe(true);
        expect(entities.indexOf(orderDetails[j].getProperty("product").getProperty("category")) >= 0).toBe(true);
      }
    }
    const allEntities = em1.getEntities();
    expect(allEntities.length).toBe(entities.length);
  });
    
    

});

