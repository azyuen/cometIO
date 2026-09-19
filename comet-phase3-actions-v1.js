// Phase 3 action language + gravity-pass animation.
// Internal mechanics remain ABSORB / DEFLECT / AVOID so scoring/history stay stable.
(() => {
  const proto = GameScene.prototype;
  const basePreload = proto.preload;
  const baseChoice = proto.choice;
  const baseAnimate = proto.animate;

  // Inline 64px Phase 3 art from the approved sprites so GitHub deployment does not depend on a
  // separate binary upload path. Mapping: triple compact objects=MERGE, asteroid path=SLING,
  // cyan escape-path art=AVOID.
  const ICON_DATA = Object.freeze({
    merge:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAASvklEQVR42u1af3BbV5X+zpXek6y6VlU1KnJc3Io2xa3b0J04sGWhJfUPYrMOmy3d7JBZEJTi2XZRW0Q9DAus2QW2UNYutJkCZQOdLN7dMoZ6VAeStLPhR6cEdTttGuLgrVVPE2dlr3CtOpLee/e+u3+8d58lx07zowV21nfmjeTnJ+ne757znXO+c4HVsTpWx+pYHavj/+2g13ygbYwDIPmrbp93M9projCqI9JpLPke5r7amNujn9vUGDH4/TZM640EwP+aACxwDoAh0HyFrF8/DkA6K9WvsVmQuYtmKIzS6zmxpHZcfLsclX6/3/d7BcA+3BsEmA+RdoP0TZDmk84/uo88S88+9jN5/M73uFYhFDgojPpfD+v8WF1BAowAW/7OXIDiQ9x9a8jjd55Ggeb348K7foCmdYTfPAl65+3AFVFgouC8AsBEgeTsYQlA0gInWe+HnBoFxLSkhefuBWBJY+rvVjL1N3KBZwWA8dLtFHzbbtueeVgA8LPtu0h+9wugD38OuCEIAHig2Xl+5KuLc3+yOA0AaMwuyOkN9dSYXcCx5pcdMAAbgB8zD9X8ZkLLlCet3pACgdrGLAC2/FV34HcBAFvuZuDSB6V9+P06AD8l+moW/0AzUOkhfOARYFM/0DNmo2fMBgBsamiE/MWDOGZ8T9hjl/mO4kFbTo1K8r0VbEM/ARCI9S3dbVstnkHXaU0L0fV/4mPQgytNOqFlTIBpAPMD7A3kiGivYCOmYKmiYCOmsHKGMA1LDDaUBYMuGHQRYa3CNCxhDldE+zZDsFRRNMUOCooPvex9T6zvBcT6XqVwmrPunECs78gi2eXLjhsArDvHTcMSpmEJNnJq9k9omRMJLWMmtIzRioGnXr9FL4Y2UNuYA8CIKXY8YwrOuYiwVkGBZkGBZt6KAdFBWRFhrWK83RSmYQnOufOZ7pyg+JB5kouF0xZrGeUUThsdlH15NmXypJa3AEYUH/o2685x1p3jrGV072kYMEtoGauDsjyhZSoKyHNZ/K8Q6eTue8G6cx4AnHMx3m6KVgyIrtAEZ9A5gy4o0CxMw7IjrFVYOcM2hyvCyhme5TTFDgoKp63qyVE4XXYBOGoOV4QDgBv7W0Z/TW1j+ZPDYt4yDUucwhp4QsvwcwXgICKdHJHOn1cDYOUMbhqWoECzaMWAaMWAAoAz6KKDsh44CijTsMSOZzwQOIXTRYDVJEcdlH3RyhkeAF2hidIpTP5nHZT9zcpkpodcS+AMun5WJEilI993324AADl7GNhfkbKREfM5G3iMPYpf44tVDMblcfk47t0/5/wtJCU+aiP4uMStrYQH/iqI6Q31tDbwofMofPcJgHm/2eS/5E2ykQEAMeiBY6Xvf2dJRLIoPmQBoFzoP9r2yg3rVsxXYJaekNeHb0AbLtVGSudiBRyRToFIp6C2McFSRbHjGWdHx9tNoXa9+jXCWkVSy4vBhrIwhyuCcy561p/wiFNxQs/6E4LCae6kuXpoNmVy07DEbMrkXaGJl5YQI6P4EKf4EKdw2qS2MXOpK61gKTyp5XlCyxhnDQBLFQXFh0S1GyiCUySoogDARCsGREzvF6Zh2bMp59mu0IQXPXY8Y4r2bYZoih0UPetPiJjezynQnFBgmcMV0UHZcQa9Lqnl+WzK5EvJjsJpi3XnOIXTnALNt1Cg+d0rp9F5ntTynEE//+yyo/iQYKmiQLTXAcFZiG3lDGEOV0RM7/cW3UFZEdP7BedccM7twYayMA1LJLSMUN+j+IBzLrpCE6IrNCE6KCtmUybnnIvZlClmU6ZIanneFZqwklp+2cyQwmmDtYxyahsTiPVZiPUtGyo7KCsHG8riTPmg1gpaRr0dpHDasYRUUQw2lIWVM7xL7aIivPZtzv2Y3s+9z7lRhI2Yomf9CTHebvKklufj7c79wYaySGp54ZJYmeJD5nIh1LUGH4XTnNrGBGsZFcuCEO29tYOyYrChLDooa7uf859+mIx0VjwOqAqFLFX0OMHdcWHlDJuNmIK1jAo2YoqklhdJLS8Q6bwrpveXElrGA1JZgpUzxHi7yWdT3nthGpZIannPQppiB3lCy/DF2oTVZq2xvpKaz3IgdFCWj7ebooOy5tnpAZFOE4CPLr8TtKbFKXxuOCk7lQBIfnkf6NPt2Dxg4bs3anj7jj14ydpad6k2svAW/ibfN266FndcJLH1U4Tb1jusbz/KHTPf6sP8PRKFQ8DuAwLPl4uYuare+4Hnjk/imO8JidJRAOBy/r5gtUvQO2/3A4CdvdfGzENadZE13l6xdh8QuKtY5z9LQYTpiLSXABBYEKRvAprWgRY45CuTkGLceeovv4LG4Snsu/ZK3Lzvy/IFDOgAZAcdsJr8lxAAXFvXgO1JHyJfW9xIW0gwH8EWDhZLgWh7OgIAuOOzx9CYXcB0NAc5/VMuAwsCMw+FAEYUvtuknV9i+MyPpV0Ym8fMQ1EFQFI7bn3zkTBd/MENXXP2C/vONUlS4ZF7V7RXhTce0/t5TO8vMehaQsvIDsryrtCEGGwoi/F2h+QUX6hkqYOyohUDYrCh7EQDN9KYwxUxmzLFeLvDGU2xg14oZS2jwg2NyjV8yv0W7y1GA0WuZyZFdee4QxonkcsJRHvLLFXkLFV08v1wWlA4zRn0AIMejOn9VldoQpGdt3hVSLkhj6soEtP7RULLiKSWF7Mpj1tsK2fYVs4Qs6kqEFpGhWlYCgCheMENkYKlioLCabMaAHO4IgYbymcEADMNSzDoDVULtxDr4xQfcsiuZZQj2ssR7XXLW8YonC7F9H6uFq92UBGcm/B4O94VmqgurEQrBkRCywgrZ4jq0Kg+177NcBKp+JCgQPNVLhEaatMoPsRPtgLGBhvK3CXY8htVMlsUTvOu0IRg3TnP5NWOmsMVL4tUi3cB5ksuEWGtohUDniVYOcP23MewvGSKwmmLwun5JTkCV9Go2pqVFSS1fOm0BZFlEpDKCotfIL6OdVofp70fuxibj8Ww7zIbuw8IfOWvIwh/hYCtPmBE4N0//SzatD5s3ujDx+t/Cxu8+pI2uJy3fwMAsnAIcu6TNugSn0x81EbhEPDx+t9ibIvE9IZ6INREALSauVQevbKx74jEZdfArR/gCi3yVGs9LQAQagKF06+4YPwrxYf2AwB8jcG1gQ9h741+NA5P4WtrNPCJaWze6HMWD9D8Pc7vz5x/GACQempK7rTiKgLRkmgkZ/QS3bzvyygcAuxHOdgH/Ihe7fzzz/5RYFNDI9aKmwihJh1gfgqnSxROF6Qx9eIx3xN44O/Xwg2Z3ph/mqEKiFMDkNTylaWsSbd8xA9AB4C1gQ/dvFbc9E7E+l4lo56mN9QDAL110zqknprC/dc3I3o1wHyE+Xuk3LXTscjI3CS+Z12Cn5SuVJOp3h1E2FUUZuvI4o8DAO0+4HzOftSZyrRWxO7Pa9j6KaoN4es2aQBUbiDvmIJ0LQQA8D3rktiunUKuFPLZad2bKCizw9GZa/xHZ67x1zx3RVSObZHwX9GI3QeEs3tCIvyORbX3Fe3Vqh/wL71oLtyI9/ueAADEqQebN/pA71ic86F6xwvvmHJvlI5KVzzV5Px95wGAPH53CA8fqwHWhjn3fLlo77TidacFwE7rYn2nFdcXJWsAt66lk3oIYtqWgQXZmF0AJgoIBhh+eEDH8+WiY7IjAtjqo+1JR7NcI7epxdeYvgzEnfcsiGvrGqD5e/CNm65F4nGCbGSY/A5D4RAwvaEemwcs2dh3xMkMHTHVXqIKWPLZx0x5/O6aAmhaK1orSe9sha7MqzUl6f4K6Lottc8WRs8HIPW5KTRmF4D9FTz8gsQ3Fy7Erp3C8bsRobgA660P4CL9LshAHDIQR5itozBbhwus83EVPoPZ7T/A9qQP9fJdeMu3JZiPPP5IPTUF3Lp20ewdH1+23pfH7zyvSmUOMOjBn5SuOO8M21J50xyuCAY97MZYk42YYpFda4oSEdP7nUTFTUZUxled/amix5XUhBJUVa4w2FD2MkL1WZUJsu6caIodVGozp3B6wc1On0O0t8RSRZWXWNUh0FWXxVn05fLSVWtLLpJaU+wgZy2jHJHOr1alx/erGJzQMqqK88BQ2aASSlVCpBZbnSlWiyOzKQcQlQGqqpDCaYsCzesR6exHtNeitjHOunOLSdkyGa2T1Z5FNegKlbTTimuALSmcNujDn/PJ736B5Px9Pnf3KwAIMw8FKJwWCDWhc77HCYvZBVy94JDze/1N2LzRh+jVwAV3SshGBqUxnlQUjQhMfofh3v1zmNaKmLCOyMmGb32JFp770Rq57eez0bhO120h3LoW9kffB7CghF2RYEFnPWfYl1wxD5jWiuSGp14AkPP3BRqHp0Af/pxEpPNva6B2xAtTivH/3KN9U8pnH4M+59C16H0zNm908CocAh5Yb2OyR2Lukzbky8KZ9IhwYr6PEAww3HGRwyUum3MUMp+/zH7w6R55d4Cu20J29l7YfZ8AtARI30R0+Z2M9E0MALkqFke016zuGlGguZMCze87E2x8symnYqvKCBdYd06Z44x6DrE+S1VpVs7gFE47OXt8iCe0jEhoGd4VmhBJLe8pQNUC6mzK9IRXJb70rD/h6vzMn9AylnIJryp0RZaTrlRRUNuYoLYxjkiniUhnWfU8dzxzhnzQQVnLqaSqKsNo711uFchrOryxPlMVTC4PcPWqKr6ElhEdlPXUn/F2p0pUi1M84S6EJ7QMj+n9lcGGMjeHKzUia3WB1b7NqCmXPTC6cwLRXu64Ogs41xkIIgktU7pCu1K3y/PYKzfq1XGXtYxy+cqklGJ8H2Ye2rwIxG0GAB8AkFEvAWBN2YfZaFxe9j+XU8tV74H5/GFidWF5//XNdPmPGT5WV8BR/jKe+MQ64IYgzF4GfdT5qUv/Yg/GF7ow2SOx+4DA7bN+MB/hv95r44+f/CMnzX7xGQDA5k8DT17sREd7+B5Qc+9iZ9qafBVzey4844iQ0DLcFRdr21uB5ne5/b/ltQNVpgaaL6VA89vU30ooURqBYn4VQdQOq11sih2sKY85514/Ul1ue06YwxXPDZSirUQbRHstBn3NWR5XyYuklucxvf+fluQA/0bhNHfyA7ZcXXEiqeWNKpcy3b5iMMJat6hSebChzDsoW6NEKxC6QhOCc267z9qqZGbQOcA4wGpAqG7EuOGxgkinRW1jApHOsztv1IqBH7o7xyOs9c+X6SOccKXspZLUfFLLV9y63ExqeYtBr3OiS+vGwYYy55yLpJbnHZTlbidIsFRxkQ9SRa7ksmp1qRoABl0g0umJLzUcsNjs5Uvnd6ZnKbSEluGudr+woskvo+e7FmQtPcyQ1PKG2xzlyr0oPsSrpHiudtU0LBFhrby6MesCUGMFCizPFWJ9wlO5l7EAdvoA2NZL1ta6F/3/jbfwNwXUTi55RsrjdwfUbiu32Gld7HMKLHtpGJLyaenGe7dY+e3gNfLZx4CHjwH7K/TwCxLuMwSAfo0vktuU9QyQwY+5SAIXWOd7CjMA4IYgWLTbWfw5H9tbbENHXEtwzflkAkxqeRU+V6jB9YD7emFSy5sR1rrV/U/AJdg3q9MkVbWFPdhQFhHWKqqasxaDLmJ6v0hqee+0imrCuPULr3KD1+/MYULLFBNaxnKPqSycNoDduQobMbmyjq7QRKXqcIRF4XQJYIRo7zcoPiRYd060bzO8CKCYXzVnKdAsklr+ZBJ0L8T6qsiPvTEHrxQQDLr2Gos31DkgJb0z6JGqqPIiSxWV5k/u2SIv81O9RCWnx/R+J8xBryVAlSU6kUCc00HJ0xmT1vs0RDpvi524a3DG/OrfvMa5P0//Y/DjJnrq2F65IeRkNN+63B6GzRq7bYSauBTjNqzJf5C/ePAz+AXok5cOIFa3gKOPDNR+41aHW4OPS+X7Tstu9rBH4KZhlPSApuH3Paht7FXn/LHjAh2ULZ/EFbG+irfzVU1ZFSLbtxmifZtxUv1A8SFR3ah1k6HS2TVH39jjid7p0A7KmnvlBn3ZvmTsthL53kp0y0dq9cmljdr9Fee+o09C/vs/g67bAvuXKYlCRjuVRRL+0Iej8hDpm2rmShckgM4bneC7azvY9l3ARAH2L1NgsVthzzxso5AJMfjrbZhz/7cAiPWdAKDR/O60NKa+7oawfwFQBxb8UwAEu+J1rOmWj8AevgewJgEtAYhpG4VMkLX8yGgsXIbpaM60D/eGzr4x8rsfvh27v85k6MqLvDtzez6IuT1bYVeIvf1+AgtKtn0X0LQO9iM3S4hpULBbwpoUKIxqKumajuboVGT/B+wCjHnltxPHCSwI2BVSuj+VjryLjOMv2eB5RNpNAAJzewJVJbsAIO3DvX6sjtWxOlbH6lgdq2Pp+F9mBpIXCT1vnwAAAABJRU5ErkJggg==',
    sling:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAMKElEQVR42u1afWwb5Rn/nR/Hce26jWuvKg1J3K0GTKKkrFuTpmuGh5C8aAaqsYbifGzVpAKqkKagjSxsqJUYqBKgNYgs05Ytg46SNUOwiVZjKKMdUCw1pFFY07mjoQZRJQ35cBtc312e/eG+b+6c9IPWoajkkU5xzue79/l8f7/nOWBe5mVe5mVe5mVevgwy0avyl1JxH9Wyn5pY13T2Ua3JCNZrWWkAWIdH8MdP/LA4AX506tr2so9qOYhO7nBMcrxrmCd6VdY1XR5+apqRAtdEBBQ6azgnWYA3S7ZjyffOnezJA3oA/ssUlG0WAICK+LWd6+q4zuXUxkF0csybYq05HQHib2b+z0kE5FEFA4ACmzw3qu9XPg8D5CwmBQDKqY1XbFGgbLPIvJ/z/HdTFbupioUBrpaUUxurYU16fqhMZTWssRrW5mZdHgpddaWFRLcO8lCZyhO9Kse7hnmoTOUgOjmITh4qmwMMILx+sbyM0ABn28vl1DbjnhEaYK05bQChPAD4qYk7HJPZW0O8a5g9FOL6SKPppvWRRq6PNLLRMBEakAvJllRSlNVx3XRfobyu6TxUpnK1vc/0zNm2wM8kxhu4qYoLbHVsVNyNILsRvGA6xLuG2UXFnEcVV5Q2IqzF/y3WhMx7NaxxizWR3XD3UxO35ydZVHkf1XKhs4bFHuyhEBc6azjeNTzjwS4qZhcVc32kkaNbB7O6sPb8JMe8KVbHdbZanKyO66yOpyMgqyEvCgwAuBGUiMpDIfZTE/uodkY6OKiIHVSUtUUEqNXk9XjXMKthja0WJzuoiHUtbQRxaM1zYAThfWEMPzWxn5pkNBgVn015Y324WPHMlJg3xRuWHmbj//WRRun56NZBjncNc7xrmNVxnesjjRzzpjiryrupisupjaNbB9lHtVxt7zPVgkzF6yONMt+l4ghyga2OC2x17KGQPIRRy6mNq+195y2cIhImelWpfLxrmKNbB7k+0ihTUXx3sSj4TEjQi3WoVe4FMILleBCZIe+1V+BU8iAcVMSEhXhp9z4QXLgZO6cvJAC6wbA5doypSXy39T5M9Kp8++p2uFUb3FRquk5E3ANKLULeXDhLLLh30314tzmOu//wM9x61/UAgFvvuh7Nf30C9266Dwvci/B7+zAu2wDl1Mbv6FsUD4VYx9j0ftvaBn/OJsTUFwBKFzoAGE32n9NxIQgu3IgfwZOzFnd7bsDrJwdxHBMYxSFoOIFDh7YDABassODmJY/gRmxH8ZrNiOvPKa+da1zsWmX2/ANKLfZajyOEm+DK/Sr+df8beGa0RSpvlD+/8BvYFO9FnWq9kPL//uTH+PT4Zi5afZs8X1Nsx85+4G7PDXh0+EOM6PuxFOsxhAMYLDmGG/rX4ysIosRzD3ZMBVAxegcOnIyD4IKRIyxalWPiBzE8jqDeyYozxeK7iV6Vkw3Ai+8lcZA/wgt8BG8l1yi/XpjObaPnM8WmeDHx8DFYH8u5IA+xnO+Ld/QtyreW/A6LVuUojBTysBL+nE0AgDVoSHtaN6eXr38lrkMDHlR+jrGho6gefRRLcAuW4Q4Q8kDIgwUOWOCAh0KyJojfd2OjwqrNdE+h/C79JuUtfY0SRCf71lqQOPs+TiUPYs/uPTPWvmf3Hkw8fAy7nlazVwD91MTV9j6OeVMcoQHucEyyg4q4nNokuPFRLbdYE9xiTXCEBjhCA9xiTXAQnayGNXku5k1xzJvioTKVKynKfmpiD4U4MwJnwyMdjklWx9NERw1rrI7r7KAiFijUQUUc7xq+si0wczEuKpYGEIq05yfZRcUcoQF2UTH7qJYFHO1wTLIa1qSixkMYKIhO9lOT7OAEqHWGETLRX4s1YYK74p5GPDDRe4X7f32kccZCRAQEqJVbrAmJtIQBfFTL7fnJaa+ENZ7oVU2HGtbk7yI0wOXUJvGCm6pYoE3jswPUavo8G9YX0SgOgVivyPvGvDRGgDCAGta4wzHJbgSl54XSgo3pmi4Vj3cNS34uIkNEQB5VsIOK2EXF7KEQt1gTJmwhlI95U6xrukxBobwRHGWN35/PAB2OSa6kqGw0BNEplRcKx7uGOUID7KYqE/EROS8Iy1CZKtPBT00sOEMeVZiorp+a5O9EzRAGMcL0rPEMN4KzpoCHQjJXo1sHZa53OCZlaKphjavtfeygIrZanAyAHVTE4vciX9XxadYmCqYwgK7pXGCr4wC1coBapXFF1My2ZnGP7DQ4ztHa2Vhde36Sq+193J6flMVGsLGJXpUjNGBSHoAkJyLPRYEUHhV8wkMhmQYBauUIDZgi6kJ8XhgrKwYQ2DyTr7uomIPoZK1Z5fb8pPSKMECHY5LzqMKkfKYRPBSS26CoCTFvSmL/SopyhAZMqVJt75PKZzLCbMisSLBU34xeesZ0LqG/p7xLT3HDE6W4bZkPZ/qnsGJLGmQpTuAfZ08ghY8v+LAp/SxAwOJ8BWf6p+DcZoHvp8ArOwIAApj8ATD+vzEMdn+En+Qm0YNuHNHvV8Q2eBIj6MZGxbhDiO8vV2ZFgsupFBY4ICirOq5zgFpZRwI96Mb6sxYkGwBlmwUff33M9Ftt6syM+4lzTJ8CAPbGVCz4RXrdJ//5CbhPwfE2Rsc3kqj/fjcaWvdil36TouEExITn5d4NJmVX5KyDG6uvOAJMBjD2712YJhKlS34rHz6El3Egdwp/P6VjFl1htTjP+zAFNhzDG5hITdO85XcuwXM9GhpGe7GTf4VubFSMin5n41NYtCpHMXKHCA3w7oMB7Dt0C6602ztrCvSgGwuwDjkoAFOKxYJ0nIYLXvxNPYodUwGglrH8pSUAgAolH6/wQgCnYLU4TZEgjKJhBA7djZA3FwBwpj89rLh9ZwKvb1yEXP0WnEKQQTpG9f1KTH9cMSJBwRd60I37V6ef+Sw/Pze9/g7HpKzQeVTBLiqWgMVPTZIPiIouqrW4bradIHNkJbZCAaLa85Nyn89ssAoglvXKfz4DVFKUY94U+6lJEh6hXDm1sZ+aeMPSw3JvFwoZ93QXFbPV4uRCZw1X2/skZhCIUWyrRgjdnp/kALWaCFK25wqXvCUKtCY87qGQ9K7gABuWHp4BhsS+7aGQRItGzxvxvGCIG5YelgYQRhDb8lUZMwlAooY1iduFIYR3RZpUUpTb85NyLGWcy8nZ3Lguz2vNKm9YeljyCHEPrXkaHrdYExdliJ9LFFRSVBIYYQRhEBcVm+it8LRQWjBBo9fVcV162EFFXG3vYxcVS2MPlamSdAXROecGmBUHTPSmFzqq71eO4CHc+dp/4FtrwZGHt+NV9zZ8SO8CAJbhDjzLz+NZfh4naQSjOSkcyJ3C3li6E+MsscBZkh5Rv78svfWNVk1hz8h/EeOH0kZWbdBxGgAw+PYU3IUKNJzADssDWE6lV8fzmdVVRIIoWGL4aGx0iHA3vpIi0kBEiWBzHgpJaOyjWnZQEXsoxGLSI6B4izUhIyCIzrmr+pfaFvNQSJIhrVmV7+EYQ93Y/GixJmTLSw1rXElRuZM4qEgqDwAFtjpuz09yizUhKXQlRWf0BrItlzwXGNMPKm6q4rfVrRg5GcGeJ9ee++ZjuFUbni75GpKYwg+PHklfryYRpxYAwKFAO779ag+O4CHoOI3BkmPw9a/EGI7J+y/UK7H+rAUNfASEPIzo+5RcDPJpfHB1XzqYbb5vnPQE0cnV9j7J2kT4ijaaiAI3VUkMIQCVADqFzhqupKikx+L8Vd0BRDFssSb4Qi85mMZehnlfga1OojqBJM83NBXhX23vk72IL8LrNrI9Ld6+upRoEY2PIDq5wFYn54LGUbmx0ApDRWiAC2x1LF5n/azD08sV5VKN8I6+xXRtobOGT5x5URFhOoVJLEYhclAAADiFN8FIYUw/qAjlRV/BCLZK9c1YTqXYT49hUh/GiL5P+TwdrFzujqDABpf9OrBqg11Pj6eS9CFO6+miJZR3UxVrGAHBJY0hPL8yFcZZ8uEofgkAUvlsNTvmVDLfB3JTFRc6a0wvSohrMiNHQN8CWx27qcrU0RWfs/02SVYj4EqmTUtxJ07TWzitfwALHDNCXmtW+WIDzS+0AYLoZNG3c1MVM1Ig5E33BTGJ8D3fxJ92PfnFDe95mZd5mZd5mZd5+VLI/wHs+bcHuwtZowAAAABJRU5ErkJggg==',
    escape:'data:image/png;base64,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'
  });

  proto.preload = function () {
    if (basePreload) basePreload.call(this);
    this.load.image('action-merge-phase3', ICON_DATA.merge);
    this.load.image('action-sling-phase3', ICON_DATA.sling);
    this.load.image('action-escape-phase3', ICON_DATA.escape);
  };

  function bounds() {
    const pulsar = TIERS.findIndex(t => t.name === 'PULSAR');
    const galaxy = Number(window.CometPhase4?.galaxyTier ?? TIERS.findIndex(t => t.name === 'GALAXY'));
    return { start: pulsar >= 0 ? pulsar : 14, end: galaxy >= 0 ? galaxy : TIERS.length };
  }

  function phase3Tier(tier) {
    const { start, end } = bounds();
    const n = Number(tier);
    return Number.isFinite(n) && n >= start && n < end;
  }

  function phase3Active(scene) {
    if (!scene) return false;
    // Normal game: Phase 3 is determined by the player's progression tier.
    if (!scene._devModeActive && !scene._labSandboxRun) return phase3Tier(scene.tierIndex);
    // LAB: the collision selector constructs its own objects, so inspect those instead of relying on
    // the real-run tier. This makes the Phase 3 icons/labels visible in LAB testing as expected.
    return [scene.player?.tier, scene.other?.tier, scene._devObjectA?.tier, scene._devObjectB?.tier, scene.tierIndex].some(phase3Tier);
  }

  function phase3Label(label) {
    if (label === 'ABSORB') return 'MERGE';
    if (label === 'DEFLECT') return 'SLING';
    if (label === 'AVOID') return 'AVOID';
    return label;
  }

  function phase3Icon(label) {
    if (label === 'ABSORB') return 'action-merge-phase3';
    if (label === 'DEFLECT') return 'action-sling-phase3';
    if (label === 'AVOID') return 'action-escape-phase3';
    return null;
  }

  function findActionText(container, originalLabel) {
    return (container?.list || []).find(child => child?.text === originalLabel) || null;
  }

  function findActionIcon(container) {
    return (container?.list || []).find(child => typeof child?.setTexture === 'function' && child?.texture) || null;
  }

  proto.choice = function(x, y, label, color, risk) {
    const before = new Set(this.ui?.list || []);
    const result = baseChoice.call(this, x, y, label, color, risk);
    if (!phase3Active(this)) return result;

    const container = [...(this.ui?.list || [])].reverse().find(child => !before.has(child) && Array.isArray(child?.list));
    const text = findActionText(container, label);
    const icon = findActionIcon(container);
    const iconKey = phase3Icon(label);

    if (text) {
      text.setText(phase3Label(label));
      text.setFontSize?.('16px');
    }
    if (icon && iconKey && this.textures?.exists?.(iconKey)) {
      icon.setTexture(iconKey);
      icon.setDisplaySize(52, 52);
    }
    return result;
  };

  function lensingArc(scene, x, y, radius, alpha = .48) {
    const g = scene.add.graphics();
    g.lineStyle(2, C.purple, alpha);
    g.beginPath(); g.arc(x, y, radius, Math.PI * .18, Math.PI * 1.42, false); g.strokePath();
    g.lineStyle(1.5, C.cyan, alpha * .7);
    g.beginPath(); g.arc(x, y, radius + 6, Math.PI * .72, Math.PI * 1.92, false); g.strokePath();
    scene.ui.add(g);
    scene.tweens.add({targets:g,alpha:0,duration:850,ease:'Sine.out',onComplete:()=>g.destroy()});
  }

  function grazeSpark(scene, x, y, rough) {
    const flash = scene.add.circle(x, y, rough ? 5 : 3.5, rough ? C.orange : C.cyan, .92);
    scene.ui.add(flash);
    scene.tweens.add({targets:flash,scale:rough?2.7:2,alpha:0,duration:280,ease:'Quad.out',onComplete:()=>flash.destroy()});
    const count = rough ? 8 : 4;
    for (let i=0;i<count;i++) {
      const a = Phaser.Math.FloatBetween(-1.25,-.25);
      const s = scene.add.circle(x,y,Phaser.Math.FloatBetween(.8,1.8),rough?C.orange:C.cyan,.9);
      scene.ui.add(s);
      scene.tweens.add({targets:s,x:x+Math.cos(a)*Phaser.Math.Between(12,30),y:y+Math.sin(a)*Phaser.Math.Between(10,25),alpha:0,duration:Phaser.Math.Between(220,390),onComplete:()=>s.destroy()});
    }
  }

  function phase3Sling(scene, p, o, pr, or) {
    const result = String(scene.pending?.result || 'clean').toLowerCase();
    if (result === 'catastrophic') return false;

    const blackHole = o?.cometVisual?.object?.kind === 'blackhole' || /BLACK HOLE/.test(String(scene.other?.name || TIERS[scene.other?.tier]?.name || ''));
    const cx = 222, cy = scene.Y(370), sx = p.x, sy = p.y;
    const startDiameter = Math.max(3, pr * 2);
    const rough = result === 'rough';

    scene.tweens.killTweensOf(p);
    scene.tweens.killTweensOf(o);
    scene.tweens.add({targets:o,x:cx,y:cy,duration:240,ease:'Sine.inOut'});
    lensingArc(scene,cx,cy,Math.max(18,or+8),blackHole?.62:.42);

    const clearance = Math.max(16, or + pr * .32 + 7);
    const c1x = cx - 92, c1y = cy + 68;
    const c2x = cx - clearance, c2y = cy - clearance * .30;
    const ex = W + 44, ey = scene.Y(214);
    let sparked = false;

    scene.tweens.addCounter({
      from:0,to:1,duration:1050,ease:'Sine.inOut',
      onUpdate:tw=>{
        const t=tw.getValue(),u=1-t;
        p.x=u*u*u*sx + 3*u*u*t*c1x + 3*u*t*t*c2x + t*t*t*ex;
        p.y=u*u*u*sy + 3*u*u*t*c1y + 3*u*t*t*c2y + t*t*t*ey;
        p.angle = -34*t;
        const near = Math.sin(Math.PI*t);
        if (rough && typeof p.setVisualDisplayDiameter === 'function') p.setVisualDisplayDiameter(startDiameter*(1-.10*near));
        if (!sparked && t>.50) { sparked=true; grazeSpark(scene,p.x,p.y,rough); }
      }
    });
    scene.time.delayedCall(1180,()=>scene.resolve());
    return true;
  }

  proto.animate = function(choice,p,o,pr,or) {
    if (phase3Active(this) && choice === 'DEFLECT') {
      const handled = phase3Sling(this,p,o,pr,or);
      if (handled) return;
    }
    return baseAnimate.call(this,choice,p,o,pr,or);
  };

  window.CometPhase3Actions = Object.freeze({
    enabled:true,
    labels:Object.freeze({ABSORB:'MERGE',DEFLECT:'SLING',AVOID:'AVOID'}),
    icons:Object.freeze({ABSORB:'action-merge-phase3',DEFLECT:'action-sling-phase3',AVOID:'action-escape-phase3'}),
    labAware:true,
    mechanicsUnchanged:true,
    deflectAnimation:'curved-gravity-assist-graze'
  });
})();
